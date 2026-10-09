# Story Phase 14: Return of Brogath

*Captain Stinkbeard and the Return of Brogath the Bashful.* The thirteenth canonical story
chapter, and the last one adapted so far. It picks up on the night of the Brogath Command
Crisis (the end of Phase 13), still inside the Great Sharkstorm, and ends a few days later
with Brogath the Bashful, Ancient Grand Stenchmaster, living aboard the Queen Anne's Revenge
for good, in the cardboard cut-out of himself from the Fan Mega-Pack, as the ship's Ancient
Historical Consultant. The treasure room is sealed again, the Grand Waft Trials are never
held, nobody makes a Steel Brogath, and the storm is still going round.

It comes in five movements:

1. **The door and the plume** (chapters 146 to 151). On deck the ship rolls (`rough_turbulence`); the captain slips below while the crew are busy, takes the signs and two planks off the treasure-room door and opens it a crack. One plume gets out, follows its nose up the stairs, through the galley and into the old quarters, and goes into the cardboard Brogath. Brogath the Bashful is back: polite, earnest, bashful, and completely unable to understand how powerful he is. Pete starts **the Brogath Rules** on a parchment nailed to a barricade (the containment corner). Then the flutter incidents (a shirt-tail, a label, a napkin, a page, a parrot, a flag), and the **Apology Eruption** (he apologises; the apology flutters).
2. **Two Grand Stenchmasters** (152 to 157). Garrick's suspension ends: the sash comes out of the captain's wardrobe on the end of Jim's fire tongs, and Garrick is back in office, with a limited number of Grand Decrees. Brogath and Garrick in one galley: a supremacy crisis (the Grand Waft Trials are mentioned, once, and only ever mentioned), compliments by turns, and a breakfast of ancient precedent (beans, onions, garlic, cabbage, Frog Grog, Spicy Stench Sauce). Emergency meeting under the hold stairs: the mop cupboard becomes the **Fart-Free Zone**. Ways to get rid of him (all bad). The pocket edition, by lamplight: the **second treasure catastrophe** (BROGATH. TREASURE. SHARKSTORM. BEANS. FLUTTER.), and a sign at the foot of the hold stairs.
3. **Money** (158 to 162). **The Grand Economy of Farts** (Gust Pieces, Wind Crowns, Atmospheric Doubloons; backed by the Bean Treasury). Brogath, pleased, has bought something: ten real doubloons from the captain's purse (exactly once) for a crate of **twenty thousand Grand Tokens of Grand Currency** (not legal tender; not gold; they buy nothing). A job for him: Grand Temporary Ancient Oat Security Officer (one oat; three sacks; sideways). Television duty: the **Frog Tax Man** on the bedroom set, until the Bling Bling King buys advertising: a sash commercial, and a crew that covers his eyes, ties the sashes down, shuts the doors and changes the channel.
4. **The Grand Bank** (163 to 166). Seven questions about banking, and Brogath ceases to be bashful: the **Anger Waft**, hot, peppery and red, and when it clears there is a bank on the deck: THE GRAND STENCHMASTER'S GRAND BANK AND GRAND TRUST, with a counter, a bell, forms, a velvet rope, a vault, a queue of haze-summoned depositors, and Gary. The captain is the teller (the **teller window**, below): sixteen depositors, three legends, and Grandmother Gustilda (10+: ABSOLUTELY NOT). Then the branch concludes business. The captain tries to redeem twenty thousand tokens and his hand goes through the vault. What are they for? Being wealthy. A Holiday Branch ornament (NO TELLER REQUIRED!) for Garrick.
5. **He lives here now** (167 to 169). A careless word on deck, and ten minutes and forty-seven seconds of catastrophe: the captain goes into the plume and consoles him (Historical. Distinguished. Ceremonial. Ancient. Authentic.). Disposal research in the zone: soak the card, spread the fragments, fan the essence for months with no powerful Grand Stenchmaster fart nearby, or he comes back in whatever's nearest: **STEEL BROGATH**. With Garrick aboard, zero chance; nobody mentions the armour. So Brogath stays, with a position. **Mandatory History Night**: the Mark II turns itself on, not plugged in, and every channel is the Stenchmaster Channel. The sash adverts are explained: professional, trained, licensed, for controlled commercial flutter.

The phase starts from the end of Phase 13: Pete, on deck, says when (talk to him).

About two to three hours of play:

- 24 chapters (146 to 169) and 25 quests with 70 objectives; 24 finished in the phase, and
  one (`grand_waft_trials`: make sure they never happen) left open on purpose.
- 205 story flags.
- About 1,150 lines of dialogue and narration in the scripts, plus about 190 lines of crew
  dialogue across the stages, and 19 depositors with their own lines.
- One new map: the **Fart-Free Zone** (`data/maps/ship/fart_free_zone.json`), through the
  little door under the hold stairs. The deck, galley, hold, quarters and cabin change through
  map patches.
- No battles. The challenges are Brogath Stability (steadying him), timing bars (planks,
  carrying, a pry, sweeping), and the teller window.

## Continuity

**From Phase 13.** The captain is in the delirium (it lifts for good when Brogath comes back:
`stinkbeard_state` = `brogath_confirmed`). Garrick is suspended for about nine more hours;
the suspension ends in chapter 152 (`stenchmaster_suspension_over`). The sash is in the
captain's wardrobe until then. Cardboard Brogath is on deck by the helm; Pete takes him below
in chapter 146 (`standee_brogath` = `below`).

**Brogath is verified.** For the first time, one of Garrick's legends is true
(`brogath_status` = `reincarnated_cardboard`; the logbook says VERIFIED). He comes back once:
`brogath_reincarnated` is set by one scene behind one objective, and nothing replays it.

**The treasure room.** Opened a crack in 146 (one plume), sealed again with five signs
(`p14_door_resealed`). The captain never goes in. From 157, Brogath never goes near it
(`treasure_exclusion_posted`; the sign at the foot of the hold stairs).

**Nothing after the source.** The phase ends with "He lives here now." No Trials, no Steel
Brogath, nobody leaves the storm, the treasure stays where it is, the Bling Bling King keeps
the crown, and Brogath is not dispersed. `tests/phase14_story.test.js` checks that no Phase 14
script sets any of those, and that no story trigger starts anything after `p14_complete`.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| Brogath the Bashful | An NPC (`brogath`) drawn as a cardboard cut-out: printed robe and sash, a fold for an elbow, a stand at the back (AGES EIGHT AND UP), the print blushing, bowing and buckling with his stability; red and hot when angry; flat edge-on when he falls sideways. |
| The Brogath Rules | A logbook (`brogath_rules`, 21 rules, one per incident that taught it) and a parchment on the barricade that grows a line at a time (`brogath_rules` variable; the props read it). |
| Flutter | Anything that flutters near him embarrasses him: incidents that raise his pressure while the captain has control, until the thing is secured and he's steadied. |
| The Apology Eruption | He apologises for a toot; the apology flutters; it gets worse. Brace, secure, catch, talk him down. IF BROGATH CALLS IT A TOOT, AGREE. |
| Garrick, back in office | The sash, via the fire tongs; Grand Decrees, limited (`p14_decree_limit`); the regalia back (`garrick_regalia_restored`). |
| The Grand Waft Trials | Mentioned at breakfast (seven days, seven events, a mountain range moved a little to the left). A quest to make sure they never happen; it never completes, and nothing holds them. |
| The Fart-Free Zone | The mop cupboard under the hold stairs: blankets, pillows, the double bunk's mattress, clean sashes three deep round the door, rags in the cracks, barrels against it, cards, Frog Grog. A refuge for the rest of the game: a mattress to rest on (it heals the party and saves), nothing smells, Brogath never comes in. |
| The second treasure catastrophe | The pocket edition, page 77: a sash on a nail, "flappy", a doubloon, a beam, a sneeze, forty ships' worth of gold into the Sharkstorm of that age. |
| The Grand Economy of Farts | Ten Gust Pieces to the Wind Crown; twelve Wind Crowns to the Atmospheric Doubloon; the Grand Gust, priceless. |
| The Grand Currency | 20,000 Grand Tokens, their own counter; ten real doubloons out of the purse, once. Tokens turn up in the beans, the scuppers, the hammocks. |
| Oat security | Three sacks, one oat, a crease in the air. Oats in the cracks for good (`oats_everywhere`). |
| Television duty | The Frog Tax Man (channel 7 on the bedroom set): safe television. Then the sash commercial, and the television safety protocol (`tv_safety_protocol`): cover his eyes, tie down the sashes, shut the doors, change the channel. |
| The Anger Waft | A scripted ANGRY state (never reached by pressure). Red, hot, peppery: it puts a bank where there wasn't one. |
| The Grand Bank | Counter, bell, forms, velvet rope, sign, vault; a queue of depositors summoned out of Stenchmaster haze; the teller window; a ledger; YOUR GAS IS OUR BUSINESS! Only while `grand_bank_open` is set. |
| The branch concludes business | It dissolves (`grand_bank_dissolved`): no counter, no vault, no depositors. A teller's badge and a Holiday Branch ornament are what's left. |
| Ten minutes and forty-seven seconds | The catastrophe, timed on a clock insert, through three decks; console him in the plume. BROGATH MAY ONLY BE CALLED AN IDIOT IF "DISTINGUISHED" IS IMMEDIATELY INCLUDED. |
| Steel Brogath | A warning on the pocket edition's last page (`steel_brogath_known`). Never made. Nobody mentions the armour. |
| Ancient Historical Consultant | His position (`brogath_consultant`, `brogath_permanent`): his duty is to remain confident. |
| Licensed sashes | The Stenchmaster Channel's adverts on the possessed Mark II: professional, trained, licensed, controlled commercial flutter. He's fine with those. |

## Chapter flow

- **146 The Door Opens** (the deck, then below). Slip below; the signs; two planks; the crack.
- **147 The Plume.** Follow it up the stairs, through the galley, through the door at the bottom.
- **148 Brogath Returns** (the old quarters). Say something to him (a reassurance prompt).
- **149 The Containment Corner.** The barricade (card table, Grog cask, sash blankets, cards); the first rules; Garrick.
- **150 Keep Brogath Confident.** Pete's theory; six flutter incidents, in order (secure the thing, then steady him); add to the rules.
- **151 The Apology Eruption.** Brace (the mast post); the loose sashes; what's sliding; the lantern; talk him down through the cloud.
- **152 Back in Office.** The fire tongs (the galley stove); the sash (your wardrobe); give it back (Garrick); hear his Grand Decrees.
- **153 Two Grand Stenchmasters** (the galley). Keep it from becoming a contest (rounds with each).
- **154 Beans of Ancient Precedent.** A compliment each, by turns; serve breakfast (six dishes); EMERGENCY MEETING (the little door under the hold stairs).
- **155 The Fart-Free Zone.** Hold the meeting (Pete); nine supplies round the ship; the cards.
- **156 Getting Rid of Brogath.** Four plans (Jim, Gristle, Bob, Ned), then Pete's.
- **157 Beyond Broke.** Read the pocket edition; the slate; the warning at the foot of the hold stairs.
- **158 The Grand Economy of Farts.** Read on; sleep.
- **159 Bad Money.** What's got him so pleased; your purse (your cabin); the delivery on deck; open it (the galley).
- **160 Grand Temporary Ancient Oat Security Officer.** The job; three sacks; check on him; sweep up.
- **161 Important Television Duty** (the old quarters). Something he'll sit still for; the right channel (the bedroom set); watch it with him.
- **162 The Sash Flutter Commercial.** Cover his eyes; change the channel; tie down the sashes; shut the doors; talk him through it.
- **163 The Grand Bank** (the deck). Ask about the bank (seven questions); the Anger Waft; take your badge.
- **164 Your Gas Is Our Business.** Ring the teller bell: sixteen depositors.
- **165 Legendary Depositors.** Three legends, the last of them Grandmother Gustilda.
- **166 The Branch Concludes Business.** REDEEM THE TOKENS (the vault); what they're for; the bank back, without you in it.
- **167 Distinguishedly Furious.** Console him (five rounds of the right thing to say).
- **168 The Brogath Problem** (the zone). Read up on dispersing him; the sums; tell him.
- **169 Mandatory History Night.** Sleep in the zone; the Mark II on by itself (the galley); turn it off (it isn't plugged in); watch it with him; a commercial break (eyes, sashes, channel); explain the sashes.

What branches: what the captain says to Brogath (every prompt has a calming answer; others
raise his pressure, and at the top a small, safe eruption plays and he settles back), the
order of the flutter incidents, supplies and plans, and how well the teller times each
deposit. What doesn't: he comes back once, the bank dissolves, the ten doubloons go once, the
catastrophe happens, and he stays.

## Systems added (reusable)

**Brogath Stability (a pressure meter for a character)**

- **Where:** rules in `src/systems/stability.js`; the world part in `src/world/StabilityRunner.js` (incidents, warning stages, the cardboard's shivers and creaks); the meter in `OverlayScene.setStability`; script commands `stability` and `reassure` (`src/systems/script/commands.js`); data in `data/story/stability/brogath.json`.
- **States**, low to high pressure: PLEASED, CALM, BASHFUL, EMBARRASSED, PRESSURIZED, CRITICAL (bands in the data). ANGRY is separate: set only by a script (`{ "stability": "anger" }`), it shows whatever the pressure.
- **Triggers and calms** are data entries with a pressure, a line and a sound (flutter +15, reminded he's cardboard +20, laughed at +25, ...; praise -20, "distinguished" -25, agree it was a toot -15, an important job -22, ...). Nothing is random.
- **Reassurance prompts** offer three things to say; at least one always calms, which ones and in what order follow a turn counter, so the same moment always offers the same choice and the player can learn what works.
- **Incidents** (a fluttering napkin, an advert) raise the pressure at a fixed rate while the captain has control, never during a scene; at the top the incident's eruption script plays (comic and safe) and the pressure drops back until the thing is secured.
- **The meter** (BASHFULNESS; WRATH when angry) is hidden in ordinary play and shows past the `reveal` level, during an incident, when angry, or when a scene asks. Each warning stage has its sound with a cooldown so nothing drones. Shivers and screen shake are skipped with Reduced effects.
- **After a catastrophe** `{ "stability": "settle" }` clears anger and incident and puts the pressure back (`settleTo`).

**The Grand Bank (a teller window)**

- **Where:** rules in `src/systems/bank.js`; the window in `src/ui/TellerView.js`; commands `bank` (`next` in a queue), `bankDeposit` and `grandCurrency`; data in `data/story/bank/grand_bank.json` (the bank, the scale 1 to 10 and 10+, the queues, the currency) and `data/story/bank/customers.json` (one entry per depositor).
- **A depositor** is data: a name, an intensity, the classes the ledger offers, a telegraph, a pattern of beats (`take` the sash, `hold` in a band, `wait`, a harmless `puff`, and a `brace` timed to a ring), and optional intro and after scripts. Adding one is one entry.
- **The window** is a hold-and-brace timing game: keep the needle in the band through the holds, then press as the ring meets. Pressing early only locks the button for a moment (no mashing). Nothing can be failed: a missed brace blows the teller back (grade 0) and the shift goes on. Then the ledger: what class was that?
- **The Grand Currency** (`{ "grandCurrency": "purchase" }`): exactly once (behind `grand_currency_acquired`), up to ten real doubloons out of the purse (all he has if fewer), 20,000 into `grand_currency_tokens`, a story variable that is never gold and that nothing spends.

**Characters kept to their rooms**

- **Where:** an NPC's `"rooms"` (`data/npcs/phase14_brogath.json`: the old quarters, the galley, the deck); `roomGuard` in `src/world/placements.js`, used by the world, the test hooks and the staging check; the validator.
- **Notes:** A placement that puts such a character anywhere else is a content error, and the world refuses it anyway. Brogath is never in the hold, the treasure room or the Fart-Free Zone. The F2 "spawn here" refuses too.

**Cardboard characters**

- **Where:** `src/art/characters/cardboardPainter.js` (sheets and portraits), looks in `data/appearances/phase14_*.json`.
- **Notes:** A flat printed figure on a stand with a few frames (idle sway, a bow, a bend, sideways, slump, watch, eat); its expressions are print changes (blush, sweat, a crease). The NPC's variants pick the look from his stability state (`brogath_state`), with ANGRY first and "full of beans" (after the breakfast, until the catastrophe) when he's calm.

**Save v14**

- **Where:** `src/systems/save/migrations.js` (13 to 14).
- **Notes:** Unchanged layout. Brogath's pressure (`brogath_pressure`), state (`brogath_state`), the rules, the zone, the bank (open only while its flag is set), the queue (`bank_served`, `bank_legends_served`), the tokens and the doubloons paid (`grand_currency_gold_paid`) are flags, variables and values that start unset. A finished Phase 13 save loads and walks into chapter 146 when the captain talks to Pete.

## Map patches and the new room

| Map | What changes |
| --- | --- |
| Main deck (`phase14/main_deck.patch.json`) | The turbulence (146). The Grand Currency crate by the forward hatch (159). The Grand Bank (163 to 166): counter 6-11,27 with the bell at 9,27 (the teller stands at 9,26), the forms, the rope, the sign, and the vault at 13-14,25-26; only while `grand_bank_open`. The queue. The evening on deck and the catastrophe (167). Tokens in the scuppers ever after. |
| Galley (`phase14/galley.patch.json`) | The plume (147). The tongs by the stove (152). The regalia heap and the decrees. The rivalry, the compliment rota, breakfast (dishes at the stove, the garlic jar, the crock, the cask, the sauce crate). The crate, opened (159). The oat post (160) and oats everywhere. The Mark II turning itself on (169). Placements keep the crossings open (the ladder's corner, the stairs' landing, the stove). |
| Cargo hold (`phase14/cargo_hold.patch.json`) | The treasure-room door: signs, planks, the crack, resealed. The little door under the stairs (a mop cupboard, then the zone; its warp applies from the meeting on). The sign at the foot of the stairs. Supplies for the zone. Never Brogath. |
| Crew quarters (`phase14/crew_quarters.patch.json`) | Brogath's room. The barricade and the parchment that grows. The flutter sources; the Apology Eruption's sliding things and lantern; the bedroom set on the Frog Tax Man; the sash commercial's doors and hammocks; the plume (167); the old quarters at night. |
| Captain's cabin (`phase14/captains_quarters.patch.json`) | The wardrobe (the sash, with tongs); the desk drawer where the purse lived (a receipt). |
| **Fart-Free Zone** (`fart_free_zone.json`, new) | Eleven by eight: a door south to the hold, a mattress, blankets on the walls, the cards table, the slate, the pocket edition by lamplight. Built up by the supplies (`fart_free_zone_reinforced`); the mattress to rest on (it heals and saves). No fumes. |

## Television

- **The bedroom set** (`data/tv/ses_kit.json`): channel 7 is the Frog Tax Man once the knob comes off (161); the state `sash_ad` (the commercial); the `advert` knob panel (cover his eyes, find a safe channel; `p14_ad_channel`).
- **The Mark II** (`data/tv/ses_mk2.json`): the state `possessed` (169: on by itself, not plugged in, every channel is the Stenchmaster Channel); the `possessed` knob panel (PULL THE PLUG; the MASTER switch turns up after three tries and finds channel 9; `p14_unplug_tried`). No panel can keep the captain: each has a way to its end.
- **Programmes:** `frog_tax_man` (`ribbit`, fourteen beats), `bbk_sash_ads` (`one_sash`, `night_campaign`), `stenchmaster_channel` (`fart_peddling_beggar`, thirteen beats).

## Logbooks

- **The Brogath Rules** (`data/logs/phase14.json`, kept by Pete): 21 rules, each with the incident that taught it and the chapter.
- **Garrick's Alleged Stenchmaster Legends:** Brogath (Returned) VERIFIED, The Second Treasure Catastrophe, The Grand Economy of Farts, When Brogath Ceaseth to Be Bashful, The Grand Waft Trials (PLEASE let it be alleged), On the Dispersal of a Cardboard Stenchmaster.
- **The Captain's Journal:** Brogath the Bashful, the treasure room (sealed, cracked once), the Grand Bank.
- **The Grand Bank's ledger** (`data/logs/phase14_bank.json`): every depositor served, with their class.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase14/ch146_151.json`, `ch152_157.json`, `ch158_163.json`, `ch164_169.json`, `bank.json` (the depositors), `world.json` (inspects round the ship) |
| Crew dialogue per stage | `data/dialogue/phase14/crew.json`; selectors in `data/npcs/phase14_crew.json`; Brogath in `data/npcs/phase14_brogath.json`; the depositors in `data/npcs/phase14_bank.json` |
| Quests, flags, triggers | `data/quests/phase14.json`, `data/story/flags/phase14.json` (every flag described), `data/story/triggers/phase14.json` |
| Stability | `data/story/stability/brogath.json` |
| The bank | `data/story/bank/grand_bank.json`, `data/story/bank/customers.json` |
| Items | `data/items/phase14.json`: Fire Tongs, Grand Currency, Teller's Badge, Holiday Branch |
| Props and art | `data/props/phase14.json`; `src/art/props/phase14Props.js`, `src/art/stage/stagePhase14.js`, `src/art/inserts/phase14Inserts.js`, `src/art/vista/vistaPhase14.js`, `src/art/characters/cardboardPainter.js`, item icons in `src/art/ui/itemIcons.js` |
| Music | `brogath_theme`, `brogath_returns`, `brogath_night`, `brogath_morning`, `zone_quiet`, `zone_night`, `grand_bank`, `anger_waft`, `catastrophe` (`data/audio/music/`) |
| Sound effects | `data/audio/sfx_phase14.json` (38: cardboard creaks, rips and steps, rumbles and eruptions, the Anger Waft, haze forming and dissolving, the teller bell, tokens, oats, tubes warming up, ...) |
| The storm | `data/hazards/sharkstorm.json` (`rough_turbulence`) |
| Presets | `data/debug/presets.json` (25, `p14_start` to `p14_complete`) |
| Debug tab | `src/debug/brogathDebug.js` and the F2 **Brogath** tab in `src/debug/DebugScene.js` |

## Persistent state after the phase

**Brogath.** Aboard, permanently (`brogath_permanent`, `brogath_consultant`,
`brogath_lives_here`): the Ancient Historical Consultant. He wanders between the old
quarters (watching the set), the galley and the deck (`brogath_spot`), never the hold. Calm
(`brogath_state` = `CALM`), not angry, no incident; his stability system stays live, so the
rules still matter.

**The ship.** Inside the Great Sharkstorm (`great_sharkstorm` = `rough_turbulence`, distance
`inside`; `queen_annes_revenge_location` = `inside_great_sharkstorm`). The Fart-Free Zone under
the hold stairs, for good. The treasure room sealed, with the sign at the foot of the stairs.
Oats in the cracks, tokens in the scuppers, the parchment on the barricade, 21 rules long.
The Mark II possessed, on the Stenchmaster Channel; the television safety protocol in force.

**The captain.** Ten doubloons poorer (exactly ten), twenty thousand Grand Tokens richer,
with a teller's badge. The delirium is over.

**Garrick.** Back in office, sash and regalia restored, the Holiday Branch on his sash.

**Left for later, and not invented here:** the Grand Waft Trials (never held; the quest stays
open), Steel Brogath (a warning), the treasure behind the door, the crown, and INSIDE THE
GREAT SHARKSTORM, which stays open.

## Debug tools (F2, development builds only)

The **Brogath** tab: jump to any of the 25 Phase 14 presets; Brogath's state (pick a band),
pressure +10/-10, anger on/off, settle, spawn here (only in his rooms), permanent on/off;
scenes (a flutter incident, his first eruption, the Apology Eruption, the ten-minute
catastrophe, end Garrick's suspension, open or close the Grand Bank, serve Grandmother
Gustilda, start the possessed television); the bank (serve any depositor, skip one); the
Grand Currency (+20,000, remove all). The **Tools** tab's automatic perfect timing also times
the teller window. Release builds contain none of it.

## Prerequisites

Phase 14 needs the end of Phase 13 (`p13_complete`): the treasure room sealed, cardboard
Brogath on deck, Garrick suspended with the sash in the wardrobe. It starts when the captain
talks to Pete on deck (`p14_started`). The `p14_start` preset gives the purse at least ten
doubloons; a save with fewer pays what it has.

## Placeholder assets

Everything is generated in code, as in earlier phases: the cardboard Brogath (sheet, angry
and loaded looks, portrait with 14 expressions), the nineteen depositors (the ordinary
character painter; they come and go in Stenchmaster haze), the bank's furniture, the zone,
the props, the inserts (the signs, the pocket edition's pages, the slate, the receipt, the
token, the badge, Gustilda's rating, the ornament, the catastrophe clock), the vistas, nine music tracks and 38 sound effects. None of it is final
art: a hand-drawn cardboard Brogath and real depositor portraits would be the first
replacements.

## Testing it

**Presets.** Each is the state recorded from a real headless walk at the start of its
chapter, chained from `p13_complete`, and each is played to the end of the phase by
`tests/phase14_story.test.js`. The 25 presets: Phase 14 Start, The Plume, Brogath Returns,
Containment Corner, Keep Brogath Confident, Apology Eruption, Back in Office, Two Grand
Stenchmasters, Beans of Ancient Precedent, Fart-Free Zone, Getting Rid of Brogath, Beyond
Broke, Grand Economy, Bad Money, Oat Security, Television Duty, Sash Commercial, The Grand
Bank, Teller Shift, Legendary Depositors, Branch Concludes, Distinguishedly Furious, The
Brogath Problem, History Night, Phase 14 Complete.

**Tests.**

- `npm test -- tests/phase14.test.js`: Brogath Stability (states and bands, ANGRY apart, every trigger up and every calm down, nothing random, clamping, prompts always offering a calm answer and the same one for the same moment, incidents erupting once, anger and settling); the teller window (the scale and 10+, the queue in order, clean deposits, a missed brace blown back, no mashing); the Grand Currency (ten doubloons once, fewer if that's all there is, tokens that buy nothing); Brogath's rooms (data, placements, the room guard); the debug tab; save v14.
- `npm test -- tests/phase14_story.test.js`: both choice paths; every chapter in order; staging; every preset to the end; one reincarnation; permanent across a save and load, with the zone; never in the hold, the treasure room or the zone, and the captain never in the treasure room; ten doubloons exactly once, 20,000 tokens; the bank gone after it concludes; a save in the middle of the teller's shift; stability put back after each catastrophe; the televisions never keeping the captain; the canonical end; the big moments once, in order; a version 13 save starting Phase 14; talking after the end; the brief scan and nothing after the source.
- `npx playwright test e2e/phase14.spec.js` (tag `@phase14`): the Brogath tab's jumps load; the meter shows and hides; a teller deposit with automatic timing; the bank across a save and Continue.
