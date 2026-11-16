/** Dynamic Expo identifiers for development / EAS builds.
 * The committed app.json remains a non-shipping preview. Developers set their
 * own app identifiers in environment variables; secrets must NEVER go here.
 */
function validApplicationId(label, value, android) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value !== value.trim()) throw new Error(`${label}: định danh ứng dụng không hợp lệ`);
  const parts = value.split('.');
  const pattern = android ? /^[A-Za-z_][A-Za-z0-9_]*$/ : /^[A-Za-z0-9][A-Za-z0-9-]*$/;
  if (parts.length < 2 || parts.some(part => !pattern.test(part)) ||
      value.toLowerCase().startsWith('com.example.') || value.toLowerCase() === 'com.example') {
    throw new Error(`${label}: cần reverse-domain ID do bạn sở hữu, không dùng com.example hoặc ký tự không hợp lệ`);
  }
  return value;
}
function buildAppConfig({config}, env = process.env) {
  const androidId = validApplicationId('TUTTT_ANDROID_APPLICATION_ID', env.TUTTT_ANDROID_APPLICATION_ID, true);
  const iosId = validApplicationId('TUTTT_IOS_BUNDLE_ID', env.TUTTT_IOS_BUNDLE_ID, false);
  return {
    ...config,
    android: {...config.android, ...(androidId ? {package: androidId} : {})},
    ios: {...config.ios, ...(iosId ? {bundleIdentifier: iosId} : {})},
  };
}
module.exports = buildAppConfig;
module.exports.buildAppConfig = buildAppConfig;
module.exports.validApplicationId = validApplicationId;
