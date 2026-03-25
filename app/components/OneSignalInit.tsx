import Script from "next/script";

const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const safariWebId = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID;

/**
 * OneSignal Web SDK (Custom Code). Set NEXT_PUBLIC_ONESIGNAL_APP_ID in .env.local.
 * Optional: NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID for Safari / iOS web push.
 */
const welcomeTitle = "disciplinaFit";
const welcomeMessage =
  "🫶SUPER! Le notifiche adesso sono attive. Le useremo per ricordarti di non mollare nelle discipline che scegli e per aiutarti con qualche info utile. 🔥";

export default function OneSignalInit() {
  if (!appId) return null;

  const initLines = [
    `appId: ${JSON.stringify(appId)}`,
    ...(safariWebId ? [`safari_web_id: ${JSON.stringify(safariWebId)}`] : []),
    `notifyButton: { enable: false }`,
    `promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: false }] } }`,
    `welcomeNotification: { title: ${JSON.stringify(welcomeTitle)}, message: ${JSON.stringify(welcomeMessage)} }`,
  ];

  const initScript = `
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    ${initLines.join(",\n    ")}
  });
});
`;

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
      />
      <Script id="onesignal-init" strategy="afterInteractive">
        {initScript}
      </Script>
    </>
  );
}
