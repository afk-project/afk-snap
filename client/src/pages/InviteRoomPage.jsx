import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import LoadingScreen from "../components/LoadingScreen";
import { joinRoom } from "../features/roomSlice";
import { notify } from "../services/notify";

export default function InviteRoomPage() {
  const { code } = useParams();
  const started = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    dispatch(joinRoom(code)).then((result) => {
      if (joinRoom.fulfilled.match(result)) {
        notify("Berhasil bergabung ke room");
        navigate(`/rooms/${result.payload.id}`, { replace: true });
      } else {
        notify(result.payload, "error");
        navigate("/rooms", { replace: true });
      }
    });
  }, [code, dispatch, navigate]);

  return <LoadingScreen label="Menghubungkan ke room virtual..." />;
}
