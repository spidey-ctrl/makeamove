# Completed tick is independent of the progress slider

The tick can be toggled manually at any progress, and reaching 100% auto-sets it. Unticking a 100%-progress move is refused, preserving the invariant "active ⟺ progress < 100". This keeps the terminal state reachable without forcing a smooth 0→100 glide, and makes Reopen the explicit escape hatch for moves "completed" by mistake.
Status: accepted