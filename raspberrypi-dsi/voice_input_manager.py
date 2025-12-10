#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VoiceInputManager
=================
使用 INMP441（I2S）麥克風錄音、呼叫 OpenAI 語音轉文字，再將結果寫入 Firebase。

功能：
1. 透過 arecord 錄製 WAV 音檔（可自訂最長秒數與 ALSA 裝置）。
2. 以 ffmpeg 轉成 16kHz/16bit 單聲道格式（OpenAI 建議）。
3. 呼叫 OpenAI STT API 取得文字結果，並可自動改用備援模型。
4. 以 REST API (`/api/save-diary`) 將文字與（可選）音檔上傳至 Firebase。

CLI 範例：
    python3 voice_input_manager.py --duration 12
    python3 voice_input_manager.py --audio /tmp/test.wav --skip-upload
"""

from __future__ import annotations

import argparse
import base64
import json
import logging
import os
import shutil
import subprocess
import wave
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

from config import (
    MICROPHONE_CONFIG,
    SPEECH_TO_TEXT_CONFIG,
    VOICE_DIARY_CONFIG,
)

try:
    import openai

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class VoiceInputManager:
    """負責錄音、語音辨識與上傳 Firebase 的整合管理器"""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.mic_config = MICROPHONE_CONFIG.copy()
        self.stt_config = SPEECH_TO_TEXT_CONFIG.copy()
        self.diary_config = VOICE_DIARY_CONFIG.copy()

        self.work_dir = Path(self.mic_config['work_dir'])
        self.work_dir.mkdir(parents=True, exist_ok=True)

        self.arecord_path = shutil.which('arecord')
        if not self.arecord_path:
            raise RuntimeError("找不到 arecord 指令，請先安裝 alsa-utils。")

        self.ffmpeg_path = shutil.which('ffmpeg')
        if not self.ffmpeg_path:
            self.logger.warning("找不到 ffmpeg，將跳過音檔格式轉換。")

        if not OPENAI_AVAILABLE:
            raise RuntimeError("openai 套件未安裝，請先執行 `pip install openai`。")

        self.openai_client = None
        
        # 嘗試自動偵測正確的錄音裝置 (I2S Mic)
        detected_device = self._detect_smart_device()
        if detected_device:
            self.logger.info(f"🎤 自動偵測到麥克風裝置: {detected_device}")
            self.mic_config['device'] = detected_device
        else:
            self.logger.info(f"🎤 使用設定的麥克風裝置: {self.mic_config['device']}")

    def _detect_smart_device(self) -> Optional[str]:
        """自動從 arecord -l 偵測 I2S 麥克風"""
        try:
            cmd = ['arecord', '-l']
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return None
                
            # 尋找 googlevoicehat 或 snd_rpi_i2s
            # 輸出範例: card 3: sndrpigooglevoi [snd_rpi_googlevoicehat_soundcar], ...
            for line in result.stdout.split('\n'):
                lower_line = line.lower()
                if 'googlevoicehat' in lower_line or 'snd_rpi_i2s' in lower_line:
                    # 解析 card number
                    # card 3: ...
                    import re
                    match = re.search(r'card\s+(\d+):', line)
                    if match:
                        card_num = match.group(1)
                        self.logger.info(f"🔍 發現 I2S 裝置在 card {card_num}")
                        return f"plughw:{card_num},0"
                        
            return None
        except Exception as e:
            self.logger.warning(f"麥克風偵測失敗: {e}")
            return None

    # ------------------------------------------------------------------ #
    # 錄音流程
    # ------------------------------------------------------------------ #
    def record_audio(self, duration: Optional[int] = None) -> Path:
        """使用 arecord 錄製音檔，回傳 WAV 檔路徑"""
        duration = duration or self.mic_config['max_duration']
        output_file = self._build_file_path(prefix='raw')

        cmd = [
            self.arecord_path,
            '-D', self.mic_config['device'],
            '-f', self.mic_config['format'],
            '-r', str(self.mic_config['sample_rate']),
            '-c', str(self.mic_config['channels']),
            '-t', 'wav',
            '-d', str(duration),
            str(output_file),
        ]

        self.logger.info(f"🎙️ 開始錄音（最多 {duration} 秒）: {output_file.name}")
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0 or not output_file.exists():
            stderr = result.stderr.decode('utf-8', errors='ignore')
            raise RuntimeError(f"錄音失敗，請檢查麥克風裝置：{stderr}")

        file_size = output_file.stat().st_size
        if file_size < 2048:
            output_file.unlink(missing_ok=True)
            raise RuntimeError("錄音檔案過小，可能未偵測到聲音。")

        self.logger.info(f"✅ 錄音完成，檔案大小 {file_size / 1024:.1f} KB")
        return output_file

    def _build_file_path(self, prefix: str) -> Path:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return self.work_dir / f"{prefix}_{timestamp}.wav"

    def _normalize_audio(self, audio_file: Path) -> Path:
        """將音檔轉為 16kHz/16bit 單聲道"""
        if not self.ffmpeg_path:
            return audio_file

        normalized_file = audio_file.with_name(f"{audio_file.stem}_16k.wav")
        cmd = [
            self.ffmpeg_path,
            '-y',
            '-i', str(audio_file),
            '-ac', '1',
            '-ar', str(self.mic_config['target_sample_rate']),
            '-sample_fmt', self.mic_config['target_sample_format'],
            str(normalized_file),
        ]

        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0 or not normalized_file.exists():
            stderr = result.stderr.decode('utf-8', errors='ignore')
            self.logger.warning(f"ffmpeg 轉檔失敗，使用原始音檔：{stderr}")
            return audio_file

        self.logger.info("🎛️ 已轉換為 16kHz/16bit WAV")

        if not self.mic_config.get('keep_raw_recording', False):
            audio_file.unlink(missing_ok=True)

        return normalized_file

    # ------------------------------------------------------------------ #
    # 語音轉文字
    # ------------------------------------------------------------------ #
    def _ensure_openai_client(self) -> openai.OpenAI:
        if self.openai_client:
            return self.openai_client

        api_key = self.stt_config.get('api_key') or os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY 未設定，無法進行語音辨識。")

        self.openai_client = openai.OpenAI(api_key=api_key)
        return self.openai_client

    def transcribe_audio(self, audio_file: Path) -> Tuple[str, Dict[str, Any]]:
        """呼叫 OpenAI STT 進行語音轉文字"""
        client = self._ensure_openai_client()
        models = []

        primary = self.stt_config.get('primary_model')
        fallback = self.stt_config.get('fallback_model')

        if primary:
            models.append(primary)
        if fallback and fallback not in models:
            models.append(fallback)

        if not models:
            raise RuntimeError("尚未設定可用的 STT 模型。")

        errors = []
        for model in models:
            try:
                self.logger.info(f"🧠 使用 OpenAI 模型 `{model}` 進行轉寫...")
                with open(audio_file, 'rb') as audio_fp:
                    params: Dict[str, Any] = {
                        'model': model,
                        'file': audio_fp,
                    }
                    temperature = self.stt_config.get('temperature')
                    if temperature is not None:
                        params['temperature'] = temperature

                    language = self.stt_config.get('language_hint')
                    if language:
                        params['language'] = language

                    prompt = self.stt_config.get('prompt')
                    if prompt:
                        params['prompt'] = prompt

                    if self.stt_config.get('verbose_json', True):
                        params['response_format'] = 'verbose_json'

                    response = client.audio.transcriptions.create(**params)

                text = (response.text or '').strip()
                if not text:
                    raise ValueError("轉寫結果為空字串。")

                metadata = response.model_dump() if hasattr(response, 'model_dump') else {}
                self.logger.info("✅ 語音轉文字完成")
                return text, metadata

            except Exception as exc:  # pylint: disable=broad-except
                errors.append(f"{model}: {exc}")
                self.logger.warning(f"模型 {model} 轉寫失敗：{exc}")

        raise RuntimeError("OpenAI 語音轉文字失敗：" + " | ".join(errors))

    # ------------------------------------------------------------------ #
    # Firebase 上傳
    # ------------------------------------------------------------------ #
    def upload_transcript(
        self,
        text: str,
        *,
        duration: float,
        audio_payload: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """呼叫 save-diary API 將文字/音訊寫入 Firebase"""
        payload = {
            'userId': (extra_metadata or {}).get('user_id', self.diary_config['user_id']),
            'content': text,
            'mode': self.diary_config.get('mode', 'stt'),
            'duration': round(duration, 2),
            'date': datetime.utcnow().isoformat(),
        }

        if audio_payload:
            payload['audioBase64'] = audio_payload

        self.logger.info("☁️ 正在將結果上傳至 Firebase...")
        response = requests.post(
            self.diary_config['api_url'],
            json=payload,
            timeout=self.diary_config.get('timeout', 20),
        )
        response.raise_for_status()

        data = response.json()
        if not data.get('success'):
            raise RuntimeError(f"Firebase 回傳錯誤：{data}")

        self.logger.info("🔥 Firebase 上傳成功")
        return data

    # ------------------------------------------------------------------ #
    # 工具方法
    # ------------------------------------------------------------------ #
    def _encode_audio_base64(self, audio_file: Path) -> str:
        with open(audio_file, 'rb') as file_obj:
            encoded = base64.b64encode(file_obj.read()).decode('utf-8')
        return f"data:audio/wav;base64,{encoded}"

    def _get_audio_duration(self, audio_file: Path) -> float:
        try:
            with wave.open(str(audio_file), 'rb') as wav_obj:
                frames = wav_obj.getnframes()
                rate = wav_obj.getframerate()
                if rate:
                    return round(frames / float(rate), 2)
        except Exception as exc:  # pylint: disable=broad-except
            self.logger.warning(f"無法讀取音檔長度：{exc}")
        return 0.0

    def _cleanup_file(self, audio_file: Path):
        try:
            audio_file.unlink(missing_ok=True)
        except Exception as exc:  # pylint: disable=broad-except
            self.logger.warning(f"刪除音檔失敗：{exc}")

    # ------------------------------------------------------------------ #
    # 封裝流程
    # ------------------------------------------------------------------ #
    def process_once(
        self,
        *,
        duration: Optional[int] = None,
        upload: bool = True,
        keep_files: Optional[bool] = None,
        audio_file: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        執行一次完整流程：
        1. 若未提供 audio_file，則先錄音。
        2. 轉檔 → 語音轉文字。
        3. 視需求上傳到 Firebase。
        """
        keep_files = (
            self.mic_config.get('keep_processed_recording', False)
            if keep_files is None
            else keep_files
        )

        if audio_file:
            final_audio = Path(audio_file).expanduser().resolve()
            if not final_audio.exists():
                raise FileNotFoundError(f"指定的音檔不存在：{final_audio}")
            self.logger.info(f"🔁 使用既有音檔：{final_audio}")
        else:
            raw_audio = self.record_audio(duration=duration)
            final_audio = self._normalize_audio(raw_audio)

        transcript, stt_metadata = self.transcribe_audio(final_audio)
        audio_duration = self._get_audio_duration(final_audio)

        upload_result = None
        if upload:
            audio_payload = (
                self._encode_audio_base64(final_audio)
                if self.diary_config.get('attach_audio')
                else None
            )
            upload_result = self.upload_transcript(
                transcript,
                duration=audio_duration,
                audio_payload=audio_payload,
            )

        if not keep_files and not audio_file:
            self._cleanup_file(final_audio)

        return {
            'text': transcript,
            'duration': audio_duration,
            'audio_file': str(final_audio),
            'upload_result': upload_result,
            'stt_metadata': stt_metadata,
        }


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="INMP441 語音輸入 → OpenAI → Firebase 工具")
    parser.add_argument('--duration', type=int, help='錄音秒數（預設為 config MIC_MAX_DURATION）')
    parser.add_argument('--audio', type=str, help='直接指定已存在的 WAV 檔，跳過錄音')
    parser.add_argument('--skip-upload', action='store_true', help='僅轉寫，不上傳 Firebase')
    parser.add_argument('--keep-files', action='store_true', help='保留轉檔後的音檔')
    parser.add_argument('--log-level', default='INFO', help='日誌等級 (DEBUG/INFO/WARNING/ERROR)')
    return parser


def main():
    parser = _build_arg_parser()
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    )

    manager = VoiceInputManager()
    audio_path = Path(args.audio).expanduser() if args.audio else None

    result = manager.process_once(
        duration=args.duration,
        upload=not args.skip_upload,
        keep_files=args.keep_files,
        audio_file=audio_path,
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

