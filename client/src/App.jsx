import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { ActiveCallsView } from './components/calls/ActiveCallsView';
import { WhiteboardView } from './components/whiteboard/WhiteboardView';
import { DocsView } from './components/docs/DocsView';
import { AuthModal } from './components/modals/AuthModal';
import { ProfileSettingsModal } from './components/modals/ProfileSettingsModal';
import { RoomFullModal } from './components/modals/RoomFullModal';

const MainApp = () => {
  const { user } = useAuth();
  const { joinRoom, leaveRoom, roomFullError, setRoomFullError } = useSocket();

  // Navigation tab: 'dashboard' | 'sessions' | 'workspace' | 'whiteboard' | 'docs'
  const [currentTab, setCurrentTab] = useState('workspace');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [initialMediaState, setInitialMediaState] = useState({ isMuted: false, isCameraOff: false });

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Initialize room based on URL query or default
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || 'arch-review-cluster';

    const loadInitialRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomParam}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentRoom(data.room);
          joinRoom(data.room.roomId, initialMediaState);
          return;
        }
      } catch (err) {
        console.warn('Initial room load error:', err);
      }

      // Default room matching Screenshot 1
      const fallbackRoom = {
        roomId: 'arch-review-cluster',
        slug: 'cdt-9921-v34',
        name: 'arch-review-cluster',
        language: 'TypeScript 5.4',
        activeBranch: 'feat/cluster-sync',
        checkpoint: 'v0.8.2',
        maxCapacity: 10,
        participants: [
          { userId: 'usr_89f02c', name: 'Sarah Connor', avatar: 'SC', role: 'host' },
          { userId: 'usr_marcus', name: 'Marcus Vance', avatar: 'MV' },
          { userId: 'usr_priya', name: 'Priya Patel', avatar: 'PP' },
          { userId: 'usr_alex', name: 'Alex Chen', avatar: 'AC' },
        ],
      };
      setCurrentRoom(fallbackRoom);
      joinRoom(fallbackRoom.roomId, initialMediaState);
    };

    loadInitialRoom();
  }, []);

  // Enter room from dashboard or invite
  const handleEnterRoom = (room, mediaState = { isMuted: false, isCameraOff: false }) => {
    setCurrentRoom(room);
    setInitialMediaState(mediaState);
    joinRoom(room.roomId, mediaState);
    setCurrentTab('workspace');

    // Update URL query without full reload
    const url = new URL(window.location);
    url.searchParams.set('room', room.roomId);
    window.history.pushState({}, '', url);
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (currentRoom) {
      leaveRoom(currentRoom.roomId);
    }
    setCurrentTab('dashboard');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0D14] text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRoom={currentRoom}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main View Area with Left Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          activeBranch={currentRoom?.activeBranch || 'feat/cluster-sync'}
        />

        {/* Dynamic Screen View */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 'dashboard' && (
            <DashboardView
              onEnterRoom={handleEnterRoom}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'workspace' && (
            <WorkspaceView
              currentRoom={currentRoom}
              setCurrentTab={setCurrentTab}
              onLeaveRoom={handleLeaveRoom}
              initialMediaState={initialMediaState}
            />
          )}

          {currentTab === 'sessions' && (
            <ActiveCallsView
              currentRoom={currentRoom}
              setCurrentTab={setCurrentTab}
              onLeaveRoom={handleLeaveRoom}
            />
          )}

          {currentTab === 'whiteboard' && (
            <WhiteboardView
              currentRoom={currentRoom}
              setCurrentTab={setCurrentTab}
              onLeaveRoom={handleLeaveRoom}
            />
          )}

          {currentTab === 'docs' && (
            <DocsView />
          )}
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <ProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <RoomFullModal
        isOpen={!!roomFullError}
        onClose={() => setRoomFullError(null)}
        onReturnToDashboard={() => {
          setRoomFullError(null);
          setCurrentTab('dashboard');
        }}
      />
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
