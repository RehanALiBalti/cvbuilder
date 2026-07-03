import Swal from "sweetalert2";

const swalBase = {
  confirmButtonColor: "#1d4ed8",
  cancelButtonColor: "#64748b",
  customClass: {
    popup: "cv-swal-popup",
    confirmButton: "cv-swal-confirm",
    cancelButton: "cv-swal-cancel",
  },
};

export async function confirmDeleteCv(cvName) {
  const result = await Swal.fire({
    ...swalBase,
    title: "Delete this CV?",
    html: cvName
      ? `Remove <strong>${escapeHtml(cvName)}</strong>? This action cannot be undone.`
      : "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}

export async function showDeleteProgress() {
  Swal.fire({
    title: "Deleting…",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export async function showDeleteSuccess() {
  await Swal.fire({
    ...swalBase,
    title: "CV deleted",
    icon: "success",
    timer: 1400,
    showConfirmButton: false,
  });
}

export async function showDeleteError(message) {
  await Swal.fire({
    ...swalBase,
    title: "Could not delete",
    text: message || "Please try again.",
    icon: "error",
  });
}

export function closeDialog() {
  Swal.close();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
