import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import * as Print from 'expo-print';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { isAppPage, parseShellMessage, shellInfoScript, webAppUrl } from '@/lib/web-app';

/* Fraction Quest on iPhone: a native shell around the live web app. Every lesson and screen comes from the web app,
   so a change there shows up here on the next launch (no app rebuild). The shell adds what a website can't do on
   its own: the iPhone print sheet, a gentle haptic tap on answers, links to other sites opening in Safari, and
   telling the page when the phone is on Wi-Fi (the page then keeps the whole voice pack on the phone). */

const BACKGROUND = '#F5F3FF';
const APP_URL = webAppUrl();

export default function FractionQuestShell() {
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [wifi, setWifi] = useState(false);

  // Wi-Fi or not: the page downloads the whole voice pack only on Wi-Fi.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const update = (state: Network.NetworkState) => setWifi(state.type === Network.NetworkStateType.WIFI && state.isConnected !== false);
    void Network.getNetworkStateAsync().then(update).catch(() => { /* treat as not on Wi-Fi */ });
    const subscription = Network.addNetworkStateListener(update);
    return () => subscription.remove();
  }, []);
  const tellPage = useCallback(() => { web.current?.injectJavaScript(shellInfoScript(Platform.OS, wifi)); }, [wifi]);
  useEffect(() => { if (!loading) tellPage(); }, [loading, tellPage]);

  // On the web (Expo's browser preview) there is nothing to wrap: go straight to the web app.
  useEffect(() => {
    if (Platform.OS === 'web' && APP_URL && typeof window !== 'undefined') window.location.replace(APP_URL);
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseShellMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'haptic') {
      const feedback = message.cue === 'selection'
        ? Haptics.selectionAsync()
        : message.cue === 'retry'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          : message.cue === 'complete'
            ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void feedback.catch(() => { /* haptics are optional and may be unavailable on this device */ });
    } else if (message.type === 'print') {
      void Print.printAsync({ html: message.html }).catch(() => { /* the child closed the sheet */ });
    }
  }, []);

  const onNavigate = useCallback((request: WebViewNavigation) => {
    if (!APP_URL || isAppPage(request.url, APP_URL)) return true;
    void Linking.openURL(request.url);
    return false;
  }, []);

  const retry = () => { setFailed(false); setLoading(true); web.current?.reload(); };

  if (!APP_URL) {
    return (
      <Message icon="settings" title="Almost ready" body="Set EXPO_PUBLIC_WEB_APP_URL (or EXPO_PUBLIC_DOMAIN) so the app knows where Fraction Quest lives." />
    );
  }
  if (Platform.OS === 'web') return <Message icon="external-link" title="Opening Fraction Quest…" body={APP_URL} />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      {failed ? (
        <Message icon="wifi-off" title="Can't reach Fraction Quest" body="Check the internet connection, then try again." action="Try again" onAction={retry} />
      ) : (
        <WebView
          ref={web}
          source={{ uri: APP_URL }}
          style={styles.web}
          originWhitelist={['*']}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={shellInfoScript(Platform.OS, wifi)}
          onShouldStartLoadWithRequest={onNavigate}
          onLoadEnd={() => { setLoading(false); tellPage(); }}
          onError={() => setFailed(true)}
          onHttpError={(event) => { if (event.nativeEvent.statusCode >= 500) setFailed(true); }}
          // Read-aloud: let the natural voice and the device voice play inside the app.
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // Keep the family signed in and progress saved between launches.
          sharedCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          setSupportMultipleWindows={false}
          // Keep login, signup, and other web form fields editable in the iOS WebView.
          textInteractionEnabled
          decelerationRate="normal"
        />
      )}
      {loading && !failed && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color="#6D4BD8" />
          <Text style={styles.loadingText}>Loading Fraction Quest…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Message({ icon, title, body, action, onAction }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.message}>
      <Feather name={icon} size={40} color="#6D4BD8" />
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageBody}>{body}</Text>
      {action && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  web: { flex: 1, backgroundColor: BACKGROUND },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: BACKGROUND },
  loadingText: { color: '#3b2a7a', fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold' },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, backgroundColor: BACKGROUND },
  messageTitle: { color: '#2B2D42', fontSize: 22, textAlign: 'center', fontFamily: 'BricolageGrotesque_700Bold' },
  messageBody: { color: '#5b5d72', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 6, minHeight: 50, paddingHorizontal: 26, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#358000' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold' },
});
