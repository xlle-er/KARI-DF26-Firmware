// First-time participants have not configured personal device credentials.
// Keep the firmware's authentication requirement without adding an onboarding field.
const initialCredential = '12345678';

export async function firstUseRequest(request, port, values) {
  try {
    return await request(port, {...values, admin_password: initialCredential});
  } catch (error) {
    if (/administrator password required/i.test(error.message)) {
      throw Error('此设备已有自定义凭据，请使用 Agent 的已有设备恢复流程；首次安装向导不会重置凭据。 / This device has custom credentials. Use the Agent existing-device workflow; credentials were not reset.');
    }
    throw error;
  }
}
