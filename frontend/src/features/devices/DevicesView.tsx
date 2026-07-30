import PasskeyManager from '../passkeys/PasskeyManager';
import SessionManager from '../sessions/SessionManager';

/** Device & login management: registered passkeys plus active sessions. */
export default function DevicesView({ onChange }: { onChange?: () => void }) {
  return (
    <>
      <PasskeyManager onChange={onChange} />
      <SessionManager />
    </>
  );
}
