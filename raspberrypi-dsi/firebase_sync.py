#!/usr/bin/env python3
"""
Firebase 同步模組
將本地儲存的資料同步到 Firebase Firestore
"""

import json
import logging
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from config import USER_CONFIG, API_CONFIG

class FirebaseSync:
    def __init__(self, local_storage):
        """
        初始化 Firebase 同步器
        
        Args:
            local_storage: LocalStorage 實例
        """
        self.logger = logging.getLogger(__name__)
        self.local_storage = local_storage
        
        # 用戶資訊
        self.user_id = USER_CONFIG['identifier']
        self.display_name = USER_CONFIG['display_name'] 
        self.group_name = USER_CONFIG['group_name']
        
        # Firebase 配置 API 端點
        self.firebase_config_url = "https://yuhsiang.vercel.app/api/config"
        self.save_record_url = "https://yuhsiang.vercel.app/api/save-record"
        
        self.logger.info(f"Firebase 同步器初始化完成 - 用戶: {self.user_id}, 群組: {self.group_name}")
    
    def sync_all_records(self) -> bool:
        """
        同步所有本地記錄到 Firebase
        
        Returns:
            bool: 同步是否成功
        """
        try:
            records = self.local_storage.get_all_records()
            if not records:
                self.logger.info("沒有本地記錄需要同步")
                return True
            
            success_count = 0
            total_count = len(records)
            
            self.logger.info(f"開始同步 {total_count} 筆記錄到 Firebase...")
            
            for i, record in enumerate(records, 1):
                if self._sync_single_record(record):
                    success_count += 1
                    self.logger.info(f"記錄 {i}/{total_count} 同步成功")
                else:
                    self.logger.warning(f"記錄 {i}/{total_count} 同步失敗")
            
            sync_ratio = success_count / total_count
            self.logger.info(f"同步完成: {success_count}/{total_count} 成功 ({sync_ratio:.1%})")
            
            return sync_ratio > 0.8  # 80% 以上成功率視為同步成功
            
        except Exception as e:
            self.logger.error(f"同步所有記錄失敗: {e}")
            return False
    
    def sync_latest_record(self) -> bool:
        """
        同步最新的記錄到 Firebase
        
        Returns:
            bool: 同步是否成功
        """
        try:
            latest_record = self.local_storage.get_latest_record()
            if not latest_record:
                self.logger.warning("沒有最新記錄可同步")
                return False
            
            return self._sync_single_record(latest_record)
            
        except Exception as e:
            self.logger.error(f"同步最新記錄失敗: {e}")
            return False
    
    def _sync_single_record(self, record: Dict[str, Any]) -> bool:
        """
        同步單筆記錄到 Firebase
        
        Args:
            record: 本地記錄資料
            
        Returns:
            bool: 同步是否成功
        """
        try:
            # 準備 Firebase 格式的資料
            firebase_record = self._convert_to_firebase_format(record)
            
            # 發送到 Firebase
            response = requests.post(
                self.save_record_url,
                json=firebase_record,
                timeout=API_CONFIG['timeout']
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.logger.info(f"✅ 記錄同步成功: Day {record.get('day')}, 城市: {record.get('city')}")
                    return True
                else:
                    self.logger.warning(f"❌ 記錄同步失敗: {result.get('error', 'Unknown error')}")
                    return False
            else:
                self.logger.warning(f"❌ 記錄同步請求失敗: HTTP {response.status_code}")
                try:
                    error_details = response.json()
                    self.logger.warning(f"錯誤詳情: {error_details}")
                except:
                    self.logger.warning(f"響應內容: {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"同步單筆記錄失敗: {e}")
            return False
    
    def _convert_to_firebase_format(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        將本地記錄轉換為 Firebase 格式
        
        Args:
            record: 本地記錄
            
        Returns:
            Dict: Firebase 格式的記錄
        """
        # 解析時間戳記
        timestamp = record.get('timestamp')
        if isinstance(timestamp, str):
            try:
                timestamp_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                timestamp_dt = datetime.now()
        else:
            timestamp_dt = datetime.now()
        
        # 格式化日期
        date_str = timestamp_dt.strftime('%Y-%m-%d')
        
        # 準備中文翻譯（如果有）
        city_zh = record.get('city_zh', record.get('city', ''))
        country_zh = record.get('country_zh', record.get('country', ''))
        
        # 準備 Firebase 記錄（符合 API 欄位格式）
        firebase_record = {
            'userDisplayName': self.display_name,
            'dataIdentifier': self.user_id,
            'city': record.get('city', ''),
            'country': record.get('country', ''),
            'city_zh': city_zh,
            'country_zh': country_zh,
            'country_iso_code': record.get('countryCode', ''),
            'latitude': float(record.get('latitude', 0)) if record.get('latitude') else 0,
            'longitude': float(record.get('longitude', 0)) if record.get('longitude') else 0,
            'timezone': record.get('timezone', ''),
            'localTime': timestamp_dt.strftime('%H:%M'),  # 修改為 HH:MM 格式
            'recordedAt': timestamp_dt.isoformat(),  # 轉換為 ISO 格式字串
            'recordedDateString': date_str,  # 添加日期字串
            'targetUTCOffset': 8,  # 台灣時區
            'matchedCityUTCOffset': 8,  # 預設為台灣時區
            'source': 'raspberry_pi_local_sync',
            'translationSource': 'local_database',
            'timeMinutes': timestamp_dt.hour * 60 + timestamp_dt.minute,
            'latitudePreference': float(record.get('latitude', 0)) if record.get('latitude') else 0,
            'latitudeDescription': '',
            'deviceType': USER_CONFIG.get('device_type', 'raspberry_pi_dsi'),
            # 添加問候語和故事內容
            'greeting': record.get('greeting', ''),
            'story': record.get('story', ''),
        }
        
        return firebase_record
    
    def test_firebase_connection(self) -> bool:
        """
        測試 Firebase 連接
        
        Returns:
            bool: 連接是否成功
        """
        try:
            self.logger.info("測試 Firebase 連接...")
            
            response = requests.get(
                self.firebase_config_url,
                headers={'Accept': 'application/json'},
                timeout=API_CONFIG['timeout']
            )
            
            self.logger.debug(f"API 響應狀態: {response.status_code}")
            self.logger.debug(f"API 響應內容: {response.text[:200]}...")
            
            if response.status_code == 200:
                try:
                    config = response.json()
                    if config.get('apiKey'):
                        self.logger.info("✅ Firebase 連接測試成功")
                        return True
                    else:
                        self.logger.warning("❌ Firebase 配置無效")
                        return False
                except json.JSONDecodeError as e:
                    self.logger.error(f"❌ Firebase API 返回無效 JSON: {e}")
                    self.logger.error(f"響應內容: {response.text}")
                    return False
            else:
                self.logger.warning(f"❌ Firebase 連接測試失敗: HTTP {response.status_code}")
                self.logger.warning(f"響應內容: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Firebase 連接請求失敗: {e}")
            return False
        except Exception as e:
            self.logger.error(f"❌ Firebase 連接測試失敗: {e}")
            return False
    
    def get_sync_status(self) -> Dict[str, Any]:
        """
        獲取同步狀態資訊
        
        Returns:
            Dict: 同步狀態資訊
        """
        local_count = self.local_storage.get_records_count()
        current_day = self.local_storage.get_current_day_number()
        
        return {
            'user_id': self.user_id,
            'display_name': self.display_name,
            'group_name': self.group_name,
            'local_records_count': local_count,
            'current_day': current_day,
            'firebase_connection': self.test_firebase_connection(),
            'last_sync_attempt': None  # 可以後續添加
        }
    
    def auto_sync_background(self) -> bool:
        """
        背景自動同步（非阻塞）
        
        Returns:
            bool: 同步任務是否啟動成功
        """
        try:
            import threading
            
            def sync_worker():
                try:
                    self.logger.info("🌐 開始背景同步...")
                    success = self.sync_latest_record()
                    if success:
                        self.logger.info("✅ 背景同步成功")
                    else:
                        self.logger.warning("⚠️ 背景同步失敗")
                except Exception as e:
                    self.logger.error(f"❌ 背景同步過程中發生錯誤: {e}")
            
            sync_thread = threading.Thread(target=sync_worker, daemon=True)
            sync_thread.start()
            
            self.logger.info("🚀 背景同步任務已啟動")
            return True
            
        except Exception as e:
            self.logger.error(f"啟動背景同步失敗: {e}")
            return False
    
    def sync_all_records(self) -> Dict[str, Any]:
        """
        同步所有本地記錄到 Firebase
        
        Returns:
            Dict: 同步結果統計
        """
        try:
            all_records = self.local_storage.get_all_records()
            if not all_records:
                self.logger.info("沒有本地記錄需要同步")
                return {'success': True, 'total': 0, 'synced': 0, 'failed': 0}
            
            synced_count = 0
            failed_count = 0
            
            self.logger.info(f"開始同步 {len(all_records)} 筆本地記錄...")
            
            for record in all_records:
                if self._sync_single_record(record):
                    synced_count += 1
                else:
                    failed_count += 1
            
            result = {
                'success': True,
                'total': len(all_records),
                'synced': synced_count,
                'failed': failed_count
            }
            
            self.logger.info(f"📊 同步完成 - 總計: {len(all_records)}, 成功: {synced_count}, 失敗: {failed_count}")
            return result
            
        except Exception as e:
            self.logger.error(f"同步所有記錄失敗: {e}")
            return {'success': False, 'error': str(e)} 