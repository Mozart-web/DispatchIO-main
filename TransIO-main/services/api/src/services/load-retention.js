const LOAD_RETENTION_HOURS = 3;

function getLoadExpiryCutoff() {
  return new Date(
    Date.now() - LOAD_RETENTION_HOURS * 60 * 60 * 1000
  ).toISOString();
}

async function deleteExpiredLoads(supabase) {
  const cutoff = getLoadExpiryCutoff();
  const { error } = await supabase
    .from("loads")
    .delete()
    .lt("received_at", cutoff);

  if (error) {
    throw error;
  }
}

module.exports = {
  LOAD_RETENTION_HOURS,
  deleteExpiredLoads,
  getLoadExpiryCutoff,
};
