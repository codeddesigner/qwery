import { useLocation } from '../lib/router.js';
import { useApp } from '../lib/store.jsx';
import { ConversationsView } from './editor/Conversations.jsx';
import { TopBar } from './Workspace.jsx';

export default function Inbox() {
  const app = useApp();
  const { path } = useLocation();
  const id = path.split('/')[2];
  return (
    <div className="ed">
      <TopBar><span className="t-h3" style={{ fontWeight: 400, marginLeft: 12 }}>Conversations</span></TopBar>
      <ConversationsView orgId={app.org.id} selected={id} basePath="/conversations" />
    </div>
  );
}
