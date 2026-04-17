function buildApplicationStatusNotification(status, jobTitle) {
  if (status === 'shortlisted') {
    return {
      title: 'Update Status Lamaran',
      message: `Selamat! Kamu masuk shortlist untuk posisi ${jobTitle}.`,
    };
  }

  if (status === 'interview_scheduled') {
    return {
      title: 'Update Status Lamaran',
      message: `Kamu diundang interview untuk posisi ${jobTitle}.`,
    };
  }

  if (status === 'hired') {
    return {
      title: 'Selamat, Kamu Diterima!',
      message: `Selamat! Kamu diterima untuk posisi ${jobTitle}.`,
    };
  }

  if (status === 'rejected') {
    return {
      title: 'Update Lamaran',
      message: `Terima kasih atas lamaranmu untuk posisi ${jobTitle}.`,
    };
  }

  return null;
}

export { buildApplicationStatusNotification };
