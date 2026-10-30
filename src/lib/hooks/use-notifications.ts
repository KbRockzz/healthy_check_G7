/**
 * Hook thiết lập local notifications cho ứng dụng
 * Request permission, configure notification handler
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  useEffect(() => {
    async function setup() {
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return;
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('User denied notification permission');
          return;
        }

        // Configure Android notification channel
        if (Platform.OS === 'android') {
          // @ts-ignore
          await Notifications.setNotificationChannelAsync('water-reminders', {
            name: 'Nhắc nhở uống nước',
            description: 'Nhắc nhở uống nước định kỳ trong ngày',
            importance: 3,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0EA5E9',
            sound: 'default',
          });
        }
      } catch (err) {
        console.warn('Notification setup failed:', err);
      }
    }

    setup();
  }, []);

  return null;
}

/**
 * Lên lịch nhắc nhở uống nước hàng ngày - mỗi giờ cố định trong ngày
 * @param startHour - Giờ bắt đầu (default 8)
 * @param endHour - Giờ kết thúc (default 22)
 * @param intervalHours - Khoảng cách giữa các lần nhắc (default 2)
 */
export async function scheduleWaterReminders(
  startHour: number = 8,
  endHour: number = 22,
  intervalHours: number = 2
): Promise<string[]> {
  const identifiers: string[] = [];

  for (let h = startHour; h <= endHour; h += intervalHours) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Uống nước nào!',
          body: 'Đừng quên uống nước để duy trì sức khỏe tốt.',
          data: { type: 'water-reminder', hour: h },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: 0,
        },
      });
      identifiers.push(id);
    } catch (err) {
      console.warn(`Failed to schedule reminder at hour ${h}:`, err);
    }
  }

  return identifiers;
}

/**
 * Hủy tất cả thông báo đã lên lịch
 */
export async function cancelWaterReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Failed to cancel water reminders:', err);
  }
}