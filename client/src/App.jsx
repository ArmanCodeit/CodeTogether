import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { HomePage } from './components/home/HomePage';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { AlertTriangle } from 'lucide-react';

const MainApp = () => {
  const { user } = useAuth();
  const { joinRoom, leaveRoom, roomFullError, setRoomFullError } = useSocket();

  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [initialRoomCode, setInitialRoomCode] = useState('');
  const [initialError, setInitialError] = useState('');

  // Handle URL invitation links on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (!roomParam) return;

    setInitialRoomCode(roomParam);

    const savedName = localStorage.getItem('cdt_display_name');
    if (!savedName) {
      // If no display name set, stay on HomePage with room pre-filled to prompt for name
      return;
    }

    // Try joining with existing display name
    const autoJoin = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomParam}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: savedName }),
        });

        const data = await res.json();
        if (res.ok && data.room) {
          setCurrentRoom(data.room);
          setCurrentUser(data.user);
          joinRoom(data.room.roomId, data.user);
        } else {
          setInitialError(data.message || 'Room could not be accessed.');
        }
      } catch (err) {
        setInitialError('Failed to connect to room.');
      }
    };

    autoJoin();
  }, []);

  // When room is full, return to Home with message
  useEffect(() => {
    if (roomFullError) {
      setCurrentRoom(null);
      const url = new URL(window.location);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url);
    }
  }, [roomFullError]);

  // Enter room from creation or join
  const handleEnterRoom = (room, participantUser) => {
    const activeUser = participantUser || user || {
      id: `usr_${Math.random().toString(36).substring(2, 8)}`,
      name: localStorage.getItem('cdt_display_name') || 'Developer',
    };

    setCurrentRoom(room);
    setCurrentUser(activeUser);
    joinRoom(room.roomId, activeUser);

    // Update URL query
    const url = new URL(window.location);
    url.searchParams.set('room', room.roomId);
    window.history.pushState({}, '', url);
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (currentRoom) {
      leaveRoom(currentRoom.roomId);
      setCurrentRoom(null);
      setCurrentUser(null);
    }
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
  };

  return (
    <div className="min-h-screen bg-[#101318] text-[#F1F4F9] font-sans antialiased">
      {/* Either show Workspace or HomePage */}
      {currentRoom ? (
        <WorkspaceView
          currentRoom={currentRoom}
          currentUser={currentUser}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <HomePage
          onEnterRoom={handleEnterRoom}
          initialRoomCode={initialRoomCode}
          initialError={initialError || roomFullError || ''}
        />
      )}

      {/* Room Full Notification Modal */}
      {roomFullError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#171B22] border border-[#303744] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F1F4F9]">Room is Full</h3>
                <p className="text-xs text-[#9AA5B5]">Maximum 10 participants limit reached.</p>
              </div>
            </div>
            <p className="text-xs text-[#9AA5B5] leading-relaxed">
              This room has already reached its maximum capacity of 10 active peers. Please try another room or create a new session.
            </p>
            <div className="pt-2 border-t border-[#303744]">
              <button
                onClick={() => setRoomFullError(null)}
                className="w-full py-2.5 rounded-xl bg-[#7C9CFF] hover:bg-[#688DFE] text-[#101318] font-bold text-xs transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
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
