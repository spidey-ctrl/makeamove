# Single completion record, not an event log

Each move stores one `completedAt` date, overwritten on every completion; history renders from move state, not from an append-only event journal. Preserving every complete/reopen cycle would model richer data but adds complexity a single-user app doesn't need. Reopen keeps the last completion record visible in history; earlier cycles are intentionally not tracked.
Status: accepted