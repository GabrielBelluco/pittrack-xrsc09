import { Radio, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function closePeer(peerRef) {
  if (peerRef.current) {
    peerRef.current.close();
    peerRef.current = null;
  }
}

export default function LiveSession({ order, socket, busy, onStartLive, onEndLive }) {
  const [role, setRole] = useState('oficina');
  const [liveStatus, setLiveStatus] = useState('Live inativa');
  const [broadcasting, setBroadcasting] = useState(false);
  const [watching, setWatching] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const roleRef = useRef(role);

  function setLiveRole(nextRole) {
    roleRef.current = nextRole;
    setRole(nextRole);
  }

  function createPeerConnection() {
    closePeer(peerRef);
    const peer = new RTCPeerConnection();

    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('live-ice-candidate', {
          orderId: order.id,
          candidate: event.candidate
        });
      }
    };

    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setLiveStatus('Recebendo transmissão ao vivo');
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peerRef.current = peer;
    return peer;
  }

  async function createOffer() {
    const peer = createPeerConnection();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('live-offer', {
      orderId: order.id,
      description: peer.localDescription
    });
    setLiveStatus('Convite de live enviado ao cliente');
  }

  async function startBroadcast() {
    if (!socket || !order) {
      return;
    }

    let sessionStarted = false;

    try {
      await onStartLive();
      sessionStarted = true;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit('live-join', { orderId: order.id, role: 'oficina' });
      setLiveRole('oficina');
      setBroadcasting(true);
      setLiveStatus('Transmitindo. Aguarde o cliente entrar.');
    } catch (error) {
      if (sessionStarted) {
        await onEndLive();
      }
      setLiveStatus(`Não foi possível iniciar a câmera: ${error.message}`);
    }
  }

  function joinAsClient() {
    if (!socket || !order) {
      return;
    }

    socket.emit('live-join', { orderId: order.id, role: 'cliente' });
    setLiveRole('cliente');
    setWatching(true);
    setLiveStatus('Aguardando sinal da oficina');
  }

  async function stopLive() {
    if (socket && order) {
      socket.emit('live-leave', { orderId: order.id });
    }

    closePeer(peerRef);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (role === 'oficina' && order.activeLive) {
      await onEndLive();
    }

    setBroadcasting(false);
    setWatching(false);
    setLiveStatus('Live inativa');
  }

  useEffect(() => {
    if (!socket || !order) {
      return undefined;
    }

    function handlePeerJoined(message) {
      if (message.orderId === order.id && roleRef.current === 'oficina' && localStreamRef.current) {
        void createOffer();
      }
    }

    async function handleOffer(message) {
      if (message.orderId !== order.id || roleRef.current !== 'cliente') {
        return;
      }

      const peer = createPeerConnection();
      await peer.setRemoteDescription(message.description);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('live-answer', {
        orderId: order.id,
        description: peer.localDescription
      });
      setLiveStatus('Conectando com a oficina');
    }

    async function handleAnswer(message) {
      if (message.orderId !== order.id || !peerRef.current) {
        return;
      }

      await peerRef.current.setRemoteDescription(message.description);
      setLiveStatus('Cliente conectado na live');
    }

    async function handleCandidate(message) {
      if (message.orderId !== order.id || !peerRef.current || !message.candidate) {
        return;
      }

      await peerRef.current.addIceCandidate(message.candidate);
    }

    function handlePeerLeft(message) {
      if (message.orderId === order.id) {
        setLiveStatus('Outro participante saiu da live');
      }
    }

    socket.on('live-peer-joined', handlePeerJoined);
    socket.on('live-offer', handleOffer);
    socket.on('live-answer', handleAnswer);
    socket.on('live-ice-candidate', handleCandidate);
    socket.on('live-peer-left', handlePeerLeft);

    return () => {
      socket.off('live-peer-joined', handlePeerJoined);
      socket.off('live-offer', handleOffer);
      socket.off('live-answer', handleAnswer);
      socket.off('live-ice-candidate', handleCandidate);
      socket.off('live-peer-left', handlePeerLeft);
    };
  }, [socket, order]);

  useEffect(() => () => {
    closePeer(peerRef);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const active = Boolean(order.activeLive);

  return (
    <div className="live-panel section-block">
      <div className="section-title">
        <h3>Live</h3>
        <span className={active ? 'live-on' : ''}>{active ? 'ativa' : 'inativa'}</span>
      </div>

      <div className="role-toggle">
        <button type="button" className={role === 'oficina' ? 'selected' : ''} onClick={() => setLiveRole('oficina')}>
          Oficina
        </button>
        <button type="button" className={role === 'cliente' ? 'selected' : ''} onClick={() => setLiveRole('cliente')}>
          Cliente
        </button>
      </div>

      <div className="video-grid">
        <div>
          <span>Câmera local</span>
          <video ref={localVideoRef} muted autoPlay playsInline />
        </div>
        <div>
          <span>Transmissão recebida</span>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
      </div>

      <p className="muted">{liveStatus}</p>

      <div className="action-row">
        {role === 'oficina' && (
          <button type="button" onClick={startBroadcast} disabled={busy || broadcasting || !socket}>
            <Video size={18} />
            Iniciar live
          </button>
        )}

        {role === 'cliente' && (
          <button type="button" onClick={joinAsClient} disabled={busy || watching || !active || !socket}>
            <Radio size={18} />
            Entrar na live
          </button>
        )}

        <button type="button" onClick={stopLive} disabled={busy || (!broadcasting && !watching)}>
          <VideoOff size={18} />
          Sair/encerrar
        </button>
      </div>
    </div>
  );
}
