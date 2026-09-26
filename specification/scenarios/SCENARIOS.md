# Qualification scenarios

| ID | Scenario and expected consequence |
|---|---|
| S-01 | A storage strategy has a futures holding but no storage/finance rights. Its capability binding is incomplete. |
| S-02 | Add barrels to gallons without conversion, or supply a fractional futures lot. Reject. Explicit bbl-to-US-gallon conversion uses 42. Negative price remains valid. |
| S-03 | Submit 100, receive no final report, propose 80. Potential total is 180. A partial fill of 60 retains the 100 upper bound. |
| S-04 | Final evidence establishes 60 filled. Potential total becomes 140. Duplicate delivery changes nothing. The old knowledge cutoff preserves the old bound. Conflicting final reports yield a conflict. |
| S-05 | Evidence changes likelihood-weighted beliefs. Replaying that evidence changes nothing. All-zero likelihood, changed replay payload, invalid probabilities or a different model identity is rejected. |
| S-06 | Oil scenarios reproduce $40k/$20k expected P&L and the $70k reduced-package closing result. Attribution sums and settlement cash is counted once. |
| S-07 | A short hedge sees 80 -> 90 -> 74. Terminal cash is positive while interim funding need remains $1m for 100 lots. Tail probability mass is split correctly at an ES boundary. |
| S-08 | Unknown physical fill with a completed 50-lot hedge widens the 50k package's worst represented loss from $130k to $530k. It cannot receive an unconditional further-trade recommendation. |
| S-09 | $750k available margin excludes the full package and permits the half package in the complete-state comparison. Negative candidate expectations select no trade. Expired context defers; unresolved execution seeks evidence. |
| S-10 | A separately supplied loss tolerance changes candidate eligibility while identical risk/P&L outputs are preserved. Missing or duplicate overlay assessments are explicit input failures. |
| S-11 | A supplied strengthening outcome produces a Brier score of 0.26 against the original [0.6,0.3,0.1] forecast. This scores that forecast; it does not prove the strategy. |
| S-12 | Changing future observations cannot change earlier signals, fills or P&L. A signal from row t executes at the next available row; gains before that execution belong only to the prior holding. Costs apply to each changed leg and terminal liquidation. |
| S-13 | The rates snapshot never selects an observation after its requested date. Missing paired prices are excluded without forward filling. Family curves are labelled synthetic and carry units. |
| S-14 | Changing strategy/size/cost parameters recomputes the displayed replay. The date cursor updates the visible history, curve and P&L. Switching uncertain/final fill evidence changes the analytical risk and decision. |
| S-15 | Equal joint price changes cancel for an equal long/short reference pair, while a separate basis-break stress creates loss. Doubling exposure doubles linear tail risk. A future tail shock breaches the unchanged prior forecast; sparse history produces an explicit unavailable forecast. |
| S-16 | Replace the execution price and every later price. Earlier records and the decision submitted for that execution remain identical. Replay a prefix with the same explicit closure date and obtain the identical prefix records. |
| S-17 | Tightening a supplied loss budget reduces a nonzero proposed size. Insufficient history rejects entry. A quiet perfectly correlated pair remains bounded by independent basis stress. Exit costs that exceed a budget are recorded while flattening remains available. |
| S-18 | An unseen gap causes actual loss; the controller cannot pre-empt it using its realized size. After observing that shock, updated tail estimates and past-breach allowance reduce later exposure. |
| S-19 | Control and observation modes receive identical prices and strategy proposals. Selected holdings differ for stated risk reasons; P&L still reconciles. Moving the browser cursor backward hides later strategy outcomes and decisions. |
| S-20 | Hand-calculated joint scenarios reproduce portfolio mean, variance and tail loss; costs reduce expected net P&L; return uses known capital. Future or misaligned observations fail. |
| S-21 | A synthetic oil exposure has freight/FX-related hedge children. Aggregation counts every direct leg once, and duplicated or cyclic strategy nodes fail. |
| S-22 | A hedge with negative standalone mean reduces combined risk enough to improve the supplied objective. Excessive costs reject it. Independent residual factors create multiple accepted recursive steps; depth and repeated-book controls terminate search. |
| S-23 | Changing execution/future prices preserves earlier hedge decisions. Prefix replay is identical under one declared horizon; selected return estimates match selected holdings and economic P&L reconciles. |
| S-24 | An identical hedge has different decision gain against different existing exposures. A supplied objective change changes primary-versus-hedge selection while preserving economic gain components. Combined actions are re-evaluated instead of summing standalone gains. |
| S-25 | A change in the supplied internal-good reference changes deviation and selected adjustments without changing historical economic forecasts. Recursive child decisions retain the original reference. Missing history is unavailable, not a zero-deviation claim. |
| S-26 | A changed execution mark leaves pre-execution explanations identical. Prefix projection is identical, and current gross P&L is attributed to the prior holding. Simulated fill deltas and costs reconcile to the new book. |
| S-27 | Searching/filtering events never reveals events beyond the cursor. Inspecting an older event rewinds linked panels; step controls, example settings and on-page explanation links remain usable. |
| S-28 | Linear delta reprices parallel and independent reference moves exactly and agrees with the shock calculus. An equal long/short pair has zero parallel delta but nonzero specified basis sensitivity. Linear price gamma is zero; unmodeled option Greeks remain unavailable. |

Scenarios are synthetic counterexamples and numerical controls. Passing them
establishes the bounded realization claims in the requirements. It establishes
no live-market profitability or adequacy beyond the represented model.
