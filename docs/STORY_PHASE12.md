# Story Phase 12: The Thirty-Second Sash Trial

The eleventh canonical story chapter. It picks up the morning after Phase 11's conspiracy,
still inside the Great Sharkstorm, and ends the same day with the Grand Stenchmaster
suspended for ONE DAY, the sash in the captain's wardrobe, and Garrick, just Garrick, trying
to get somebody to pull his finger.

It comes in four movements, adapted from the middle part of the source:

1. **The trial** (chapters 112 to 115). He woke up loaded. The captain gears up (a wet cloth, bottle-bottom goggles, a waist rope, a beard wrap; Bob's pot if he likes), goes up on deck and, when the two sash holders turn out to have the same cold, **volunteers**. The old sash smells worse than his beard. The pre-waft. Then the **Thirty-Second Trial**: a real, interactive hold, with Pete counting.
2. **The flutter** (116 and 117). THIRTY: the captain opens his hands on purpose. The storm finds the loose sash and it flutters, in front of everybody; the crew gasp and point exactly as rehearsed. The humiliation makes the blast worse; the Mark II switches itself on below to a shark holding its nose; the storm sends complaints. Witnessed, valid: THREE WEEKS.
3. **The dice** (118 to 122). He invokes the Grand Dice. Ransacking the galley turns up Bob's normal die, which falls out of his pocket showing six (it doesn't count). The real one, purple foam, is at the bottom of the Cheap-O-Rama crate. The fine print has no escape (eight clauses, each worse). The Bling Bling King sends six more. The ceremony: inspect, witness, roll: **six, THREE MONTHS**. The galley explodes. Then the die starts to move. Jumping beans. Three hops, three catches: **three, ONE DAY**.
4. **One day** (123 to 126). The suspension rules: no title, no decrees, no regalia. Off it comes. "Morning, GARRICK." The authenticity whiff (the captain's, by rule). The sash goes into his wardrobe with his coats. A normal pirate breakfast. And Garrick, in withdrawal, follows the crew round asking them to pull his finger. On television, the Bling Bling King covers the day.

The phase starts from the end of Phase 11: the galley says where (the captain's bed, in the
morning), once.

About 70 to 100 minutes of play:

- 15 chapters (112 to 126) and 14 quests with 23 objectives; 13 are finished in the phase and one, THE SUSPENSION, stays open.
- 92 story flags.
- About 450 lines of dialogue and narration in the scripts, plus about 100 lines of crew dialogue across the stages.
- No new maps: the galley, the deck, the hold and the captain's cabin, all through map patches.
- No battles. The challenges are the thirty-second hold, catching the hopping die, and breakfast (six timing bars: cracking the eggs, stirring the bacon and the potatoes, plating the toast, slicing the fruit, pouring the tea).

## Continuity

**From Phase 11.** The conspiracy is sworn (`conspiracy_ready`); the six-rope lamp hangs; the
hammocks are sashed; the pocket edition is on Garrick's chest with a torn last page. No dice
are aboard. The Revenge is inside the storm (`great_sharkstorm` moves to `inside_morning`).

**The die is never random.** Every `dice` roll in the data names its result, and the
validator refuses one that doesn't. The canonical sequence is fixed: apparent six (THREE
MONTHS), then the jumping beans, final three (ONE DAY). The die's faces are data: three is
printed ONE DAY on the Grand Dice even though the booklet's Table B says six hours (a
misprint; the Grand Dice are always correct).

**Garrick's name while suspended.** From the moment the regalia comes off
(`regalia_removed`) the dialogue box, the NPC's title and his look say **Garrick** (title
"Garrick (suspended)", appearance and portrait `garrick_suspended`). His id is still
`garrick` everywhere: quests, dialogue selectors, saves.

**The sash stays in the wardrobe.** Custody is the captain's for the whole Silence
(`stenchmaster_sash_custody` = `captains_wardrobe`). Nothing in Phases 12 or 13 takes it out.

**The Bling Bling King is silent in person**; it appears on television only (the one-day
special), through the speaker `bling_king_tv`.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| He woke up loaded | Garrick climbs down holding his stomach with both hands: "This one needs AIR." His look is charged until the trial. |
| Protective gear | Four pieces from four places (Jim's bucket, the salvage crate in the hold, the stores, the captain's wardrobe), and Bob's clay pot (optional). The captain's look changes to the trial gear (with or without the pot) and back afterwards. |
| The volunteer | Rusty Tom and Barnacle Bill have the same cold. "I'll do it." Garrick weeps: "You RESPECT the institution." "No." |
| Worse than the beard | The old sash, up close: every feast, every nap, every release, soaked into one strip of cheap cloth (`old_sash_worse_than_beard`). |
| The pre-waft | Two small yellow warning plumes, straight into the goggles. "Purely ceremonial." |
| The thirty seconds | The hold (below): Pete counting, the fart growling at five, surging at twenty, the band narrowing, the sash fighting back at twenty-five; never failable (`thirty_seconds_held`). |
| The flutter, on purpose | At THIRTY, LET IT FLUTTER: the captain opens his hands (or, if he doesn't press, his hands slip). Gasp, point, OH THE SHAME, "Disgraceful", "I'm a WITNESS", "Flap-flap" (`sash_fluttered`, `sash_flutter_humiliation` = `valid`). |
| The humiliation blast | The shame makes it worse: the blast doubles, the ship rattles, the Mark II comes on below to the shark holding its nose. Four complaints from the storm: EXCESSIVE BUTTQUAKE, SOME OF US ARE TRYING TO ROTATE, WEATHER CONTAMINATION, 1 STAR. |
| Three weeks | Claimed. He invokes the dice clause before anyone can enjoy it (`dice_clause_invoked`). |
| A normal six | Bob's bone die falls out of his pocket showing six. "IT COUNTS!" It doesn't (`normal_die_six`). |
| The Grand Dice | Purple foam, pips the size of plates, DISPLAY MODEL - NOT FOR SALE, at the bottom of the crate (`grand_dice_found`). The fine print: eight clauses, every loophole worse than the last. Then six more, by delivery (`grand_dice_count` = `seven`). |
| THREE MONTHS | Inspected, witnessed (Squawks, first option), rolled: six. The crew celebrate (`grand_dice_apparent_result` = `six_three_months`). |
| Jumping beans | The die hops round the galley; catch it three times; it lands on three. "The first face shown is not binding while there is internal bean activity." ONE DAY (`grand_dice_final_result` = `three_one_day`). |
| The suspension | A Stench Silence: no title, no decrees, no feasts, no naps, no regalia (`stenchmaster_suspension_active`, duration `one_day`, `suspension_hours_left` counting down from 24; `garrick_title_state` = `suspended`). "Morning, GARRICK." |
| The authenticity whiff | By rule the highest-ranking officer verifies the sash: look, fabric, fringe, then the ceremonial inhalation. Saying no brings the rule back round to the question. |
| The wardrobe | The sash lives in the captain's wardrobe, behind the good coat, with a faint yellow curl leaking out under the door. "That's his coats done for." |
| A normal breakfast | Eggs, bacon, potatoes, toast, fruit, tea; eaten in peace (`normal_breakfast_eaten`). |
| Pull my finger | Garrick follows Pete, Bob, Gristle, Jim and Rusty Tom round asking. Nobody pulls it (`finger_crisis_seen`). On television: the Grand Court's ruling on dice, the cook with a ladle, a reconstruction of THE THIRTY SECONDS in a very small captain's hat. |

## The Thirty-Second Trial (how it plays)

The `sashTension` command opens the Sash Tension view (`src/ui/SashTensionView.js`; rules in
`src/systems/tension.js`; data `data/story/tension/phase12.json`):

- A needle on a meter, and a band to keep it in. Hold Confirm (or Up) to pull, let go to ease. The ship sways; the blast surges at 20 and 26.5; gusts join in at 25; the band narrows at 20 and 25.
- Thirty real seconds. Pete counts every one aloud; milestones at 2, 5, 10, 15, 20, 25 and 27 to 30 change the text, the sound, the haze and the shake.
- Fail-soft: out of the band for 1.8 seconds, somebody grabs the end ("NOT YET!"), the needle goes back to the middle, it counts as a slip, and the clock keeps running.
- At thirty the cue says LET IT FLUTTER. One deliberate press lets go; with no press, the captain's hands slip after four seconds anyway (`trial_released` 1 or 0; `trial_slips`).
- Screen shake follows the shake setting; haze is capped lower with reduced effects. The debug "auto timed hits" holds it perfectly.

## Chapter flow

- **112 He Woke Up Loaded** (the galley). Gather the gear: Jim's bucket, the goggles in the hold's salvage crate, the stores' rope, the beard wrap in your wardrobe; Bob's pot if you want it.
- **113 Volunteer** (up on deck). The ceremony by the mainmast; take the sash.
- **114 Pre-Waft.** The smell; the warning plumes.
- **115 The Thirty-Second Trial.** Hold it (him, from behind).
- **116 The Flutter.** Let it go; the surge; read the four complaints on the deck.
- **117 Three Weeks!** Claimed, and the dice invoked.
- **118 Find the Dice** (the galley). Follow him: the drawers, the beans, the long table, the crate; Bob's die; search the crate yourself.
- **119 Rules, Loopholes and No Escape.** The fine print, eight clauses.
- **120 The Grand Dice Shipment.** The crate at the foot of the ladder: six more.
- **121 The Grand Dice Ceremony.** Inspect, choose a witness, let him roll, celebrate.
- **122 Mexican Jumping Beans.** Catch the die three times.
- **123 Garrick Is Not Grand.** Read him the rules; the regalia comes off.
- **124 The Authenticity Whiff.** Look, fabric, fringe; the inhalation; the wardrobe (your cabin).
- **125 A Normal Pirate Breakfast** (the galley). Cook the six parts; eat.
- **126 One Day Is Apparently Unbearable.** Follow him round: Pete, Bob, Gristle, Jim, Rusty Tom. The one-day special on the Mark II.

The captain's choices (the pot, what to shout at the flutter, whether to keep reading the
fine print, saying no to the whiff the first time) converge. What doesn't branch: the hold is
the full thirty seconds, the sash flutters, the die says six then three, he is suspended for
one day, and the sash goes in the wardrobe.

## Systems added (reusable)

**Sash tension (a hold-and-ease timing game)**

- **Where:** `src/systems/tension.js` (rules, engine-agnostic), `src/ui/SashTensionView.js`, the `sashTension` command (`{ "sashTension": "<id>", "var": "<slips var>", "releasedVar": "<released var>" }`), definitions in `data/story/tension/*.json`.
- **Notes:** A definition has `seconds`, `band`, `pull`, `slack`, `sway`, `grace`, `surges`, `milestones` (each can change the band, sway and gusts, and carry text, sound, haze, shake), `count` (the voice), and `release` (the cue, the auto-slip time). Nothing can fail. The command stores the slips and how it was released in story variables. Validated: the definition must exist and make sense.

**A scripted die sequence**

- **Where:** the `dice` command (`show`, `roll`, `hop`, `hold`, `hide`), `src/ui/DiceView.js`, dice in `data/story/dice/*.json` (art prefix, the text on each face, sounds).
- **Notes:** Never random: `roll` must name its `result`, `hop` its `to`. The die stays up between commands so the cast can talk over it; `hold` shows a ring counting down while it sits still.

**Story-driven looks for the captain**

- **Where:** `data/characters/phase12.json` (variants on `blackbeard`); painter extras in `src/art/characters/characterPainter.js` (goggles, beard wrap, toy sash, crown stack).
- **Notes:** The trial gear goes on with `trial_gear_on` and off with `trial_gear_off`; Bob's pot shows if he took it.

**Save v12**

- **Where:** `src/systems/save/migrations.js` (11 to 12).
- **Notes:** Unchanged layout. The trial, the dice, the suspension (active, its duration, the hours left), the sash's custody and the breakfast are flags, variables and values that start unset: no suspension, the sash where Garrick left it.

## Map patches

| Map | What changes |
| --- | --- |
| Galley (`data/maps/ship/phase12/galley.patch.json`) | The gear (Jim's bucket, the stores' rope). The ransack: the drawers, the beans, the long table, the crate, Bob's die. The Grand Dice on the long table, its six siblings by the ladder; where it hops (by the hammock, by the stove, under the table's edge, where it stays on three). The regalia laid aside on the bench end. Breakfast at the stove, the prep table and the long table. The finger crisis round the room. |
| Main deck (`phase12/main_deck.patch.json`) | The trial at the mainmast: Garrick facing the bow, the captain behind him, the crew in a half-circle at a respectful (large) distance, the two holders behind the mast. The four complaints, all over the deck. |
| Cargo hold (`phase12/cargo_hold.patch.json`) | The salvage crate, with a pair of bottle-bottom goggles in it (Phase 12 only). |
| Captain's cabin (`phase12/captains_quarters.patch.json`) | The wardrobe: a clean neckerchief for the trial; then the sash, behind the good coat, a faint yellow curl leaking out underneath. |

## Television

- **The Mark II, channel 8:** **The Bling Bling King Show**'s `one_day_special` (on once the finger crisis is seen): the Grand Court's ruling on dice, the cook with a ladle, "That's not a breakfast. That's a hostage situation.", and the dramatic reconstruction of THE THIRTY SECONDS.
- During the surge the Mark II switches itself on and comes to rest on the shark holding its nose (an insert drawn on the CRT palette).

## Logbooks

`data/logs/phase12.json`:

- **Garrick's Alleged Stenchmaster Legends:** the dice rule (updated: the Grand Dice found), The Stench Silence (Suspension).
- **The Bling Bling King's Participation Trash:** The Complaints, The Six Dice, The Shark Book (the odds).
- **The Captain's Journal:** The One-Day Silence.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase12/ch112_118.json`, `ch119_126.json`, `world.json` (the dice, the six dice, the regalia, the salvage crate, the wardrobe); `p12c5.from_surge` puts the flutter back up for the Runaway Humiliation Blast preset |
| Crew dialogue per stage | `data/dialogue/phase12/crew.json`; selectors and Garrick's suspended variant in `data/npcs/phase12_crew.json`; the captain's looks in `data/characters/phase12.json` |
| Quests, flags, triggers | `data/quests/phase12.json`, `data/story/flags/phase12.json`, `data/story/triggers/phase12.json` |
| The trial, the die | `data/story/tension/phase12.json`, `data/story/dice/phase12.json` |
| Items | `data/items/phase12.json`: Wet Cloth, Bottle Goggles, Waist Rope, Beard Wrap, Bob's Pot, The Sash |
| Vistas | `data/story/vistas/phase12.json`: `sash_flutter` (the mainmast from behind, the blast, the sash a stage at a time to FULL FLUTTER, the surge) |
| Art | `src/art/vista/vistaPhase11.js` (the flutter, the Grand Dice frames), `src/art/inserts/phase11Inserts.js`, `data/appearances/phase11.json` and `data/portraits/phase11.json` (Garrick suspended, the trial gear) |
| Music | `thirty_second_trial`, `flutter_triumph`, `grand_dice_ceremony`, `one_day_suspension` |
| Presets | `data/debug/presets.json` (21, `p12_start` to `p12_complete`) |

## Persistent state after the phase

**The ship.** Inside the Great Sharkstorm, morning (`great_sharkstorm` = `inside_morning`,
distance `inside`). The treasure room is sealed. The old quarters are still condemned.

**Garrick.** Suspended (`stenchmaster_suspension_active`, one day, about twenty hours left),
called Garrick, without the regalia, in withdrawal. THE SUSPENSION (keep him to it) is open.

**The sash.** In the captain's wardrobe (`stenchmaster_sash_custody` = `captains_wardrobe`,
`sash_in_wardrobe`); the captain doesn't carry it.

**The dice.** Seven Grand Dice aboard; the result recorded as an apparent six and a final
three. The pocket edition is down to a loose staple.

**Left for later:** Phase 13 starts when the captain talks to Garrick (`p13_ready_hint`).
INSIDE THE GREAT SHARKSTORM stays open.

## Testing it

**Presets.** Each is the state recorded from a real headless walk, chained from
`p11_complete`, and each is played to the end of the phase by `tests/phase12_story.test.js`.
The 21 presets:

Phase 12 Start, Garrick Loaded, Protective Gear, Sash Volunteer, Pre-Waft, Thirty-Second
Trial, Flutter Moment, Runaway Humiliation Blast (starts at full flutter), Three Weeks Claimed,
Dice Search, Real Grand Dice Found, Grand Dice Shipment, Grand Dice Ceremony, Apparent Three
Months, Jumping Bean Betrayal, One-Day Suspension, Authenticity Whiff, Sash Wardrobe, Normal
Breakfast, Finger-Pulling Crisis, Phase 12 Complete.

**Tests.**

- `npm test -- tests/phase12_story.test.js`: both choice paths; every chapter in order; staging; every preset to the end; the trial (exactly thirty counted seconds, fail-soft, the deliberate release, pressed or slipped); the flutter after the hold; the dice (the normal six first, roll 6 then hop to 3, never random); the suspension (name, title, look, portrait, the crew's lines); the wardrobe; the canonical end state and the big moments in order; saves mid-phase; a version 11 save migrating in; the brief scan.
- `npx playwright test e2e/phase12.spec.js` (tag `@phase12`): the whole phase in a browser and from the ceremony; the trial held with real key presses; the dice; the suspended name in the dialogue box and the wardrobe; every preset loads.
