import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { cleanReminderSettings, NO_REMINDER, REMINDER_BODY, REMINDER_TITLE, reminderDates, type ReminderMessage, type ReminderSettings } from './reminders';
import type { ReminderStatus } from './web-app';

const SETTINGS_KEY = 'fraction-quest-reminder';
const PRACTISED_KEY = 'fraction-quest-practised-day';
const CHANNEL = 'practice-reminder';

// While Fraction Quest is open, the child is already practising: no banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Schedules the grown-up's practice reminders on this phone, tells the page the settings, and reports a reminder tap
    (the page then opens today's practice). */
export function useReminders(): [ReminderStatus | null, (message: ReminderMessage) => void, number | null] {
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const settings = useRef<ReminderSettings>({ ...NO_REMINDER });
  const practised = useRef<string | null>(null);

  const schedule = useCallback(async () => {
    const permission = (await Notifications.getPermissionsAsync().catch(() => null))?.status ?? 'undetermined';
    setStatus({ ...settings.current, permission });
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    if (permission !== 'granted') return;
    for (const date of reminderDates(settings.current, new Date(), practised.current)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: REMINDER_TITLE, body: REMINDER_BODY, data: { open: 'practice' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
      }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    void (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Practice reminder', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => undefined);
      }
      const [saved, day] = await Promise.all([AsyncStorage.getItem(SETTINGS_KEY), AsyncStorage.getItem(PRACTISED_KEY)]).catch(() => [null, null]);
      try { settings.current = cleanReminderSettings(saved ? JSON.parse(saved) : null); } catch { settings.current = { ...NO_REMINDER }; }
      practised.current = day;
      if (live) await schedule();
      // Opened by tapping a reminder.
      const last = await Notifications.getLastNotificationResponseAsync().catch(() => null);
      if (live && last?.notification.request.content.data?.open === 'practice') setOpenedAt(last.notification.date || Date.now());
    })();
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.open === 'practice') setOpenedAt(Date.now());
    });
    // Top up the next four weeks (and pick up a permission change in Settings) whenever the app comes back.
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void schedule(); });
    return () => { live = false; tapped.remove(); foreground.remove(); };
  }, [schedule]);

  const act = useCallback((message: ReminderMessage) => {
    void (async () => {
      if (message.action === 'practised') {
        if (practised.current === message.day) return;
        practised.current = message.day;
        await AsyncStorage.setItem(PRACTISED_KEY, message.day).catch(() => undefined);
      } else {
        settings.current = cleanReminderSettings(message);
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.current)).catch(() => undefined);
        // Turning a reminder on asks the phone for permission (only the first time does the phone show its question).
        if (settings.current.time) await Notifications.requestPermissionsAsync().catch(() => undefined);
      }
      await schedule();
    })();
  }, [schedule]);

  return [status, act, openedAt];
}
