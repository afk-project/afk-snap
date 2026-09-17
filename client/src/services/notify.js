import Toastify from "toastify-js";

export const notify = (text, type = "success") => {
  Toastify({
    text,
    duration: 3200,
    gravity: "top",
    position: "right",
    close: true,
    style: { background: type === "error" ? "#dc2626" : "#f97316", borderRadius: "12px" },
  }).showToast();
};

export const getErrorMessage = (error) => error.response?.data?.message || error.message || "Terjadi kesalahan";
