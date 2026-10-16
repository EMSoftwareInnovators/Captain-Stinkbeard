import { token } from './phase10Inserts.js';
import { pocketPage, noteCard, sign } from './phase11Inserts.js';
import { framed, form } from './phase15Inserts.js';

/**
 * Story Phase 16 close-ups (THE GRAND LIGHTER):
 *   - the Grand Lighter's box (Cheap-O-Rama, Cheapy the Cheapskate Clown, NOW WITH GRANDNESS!) and its instructions
 *     (which are a joke, not instructions);
 *   - the Bling Bling King's Coffin Sock complaint; the Stenchmaster Fart Zone's warning sign and its posted rules;
 *   - the Grand Dispensary's sign and the employee visor's badge; the converter's receipt (and the policy);
 *   - GRAND SASHBACK REWARDS: the card, Lady Rancidella's approval, BZBZBZBZZZZ-7's;
 *   - the 97-page application (page 1, page 61: AGNES THE SECOND, DO NOT TOAST), the stamp (PRE-IGNITION REVIEW
 *     REQUIRED), the Council's ruling;
 *   - THE STINGBEARD BULLETIN; the bunker's sign.
 * Nothing on any of them is a real procedure.
 */
const PURPLE = { d: '#3a1e52', m: '#5a3278', l: '#9468b8' };
const GOLDC = { d: '#9a7418', m: '#d8b032', l: '#f4dc6c' };
const CHEAPO = { bg: '#7a3a9a', fg: '#f4dc6c', border: '#e0c050' };

export function addPhase16Inserts(atlas) {
  atlas.add('lighter_box', framed(["THE GRAND STENCHMASTER'S", 'GRAND LIGHTER', 'OF GRAND SMOKES', '', 'NOW WITH GRANDNESS!', 'WORKS SOMETIMES!*', '', '*SOMETIMES', '', 'CHEAP-O-RAMA. ASK FOR CHEAPY!'], { ...CHEAPO }));
  atlas.add('lighter_instructions', framed(['1. HOLD LIGHTER.', '2. BELIEVE.', '3. CLICK.', '4. CLICK AGAIN.', '5. KEEP CLICKING.', '6. NO REFUNDS.', '', 'NOT FOR USE NEAR GRAND STENCHMASTERS,', 'THEIR SASHES, THEIR CROWNS,', 'OR THEIR EMOTIONS.'], { title: 'INSTRUCTIONS (ABRIDGED)', titleBg: CHEAPO.bg }));
  atlas.add('bbk_coffin_sock', token('THE BLING BLING KING|HAS RECEIVED|YOUR COFFIN SOCK.|PLEASE STOP.'));
  atlas.add('fz_warning', sign(['STENCHMASTER FART ZONE', 'AUTHORISED GRAND RELEASES ONLY', 'KEEP DOOR SHUT.', 'KEEP PORTHOLES OPEN.', 'KEEP OUT.']));
  atlas.add('fz_rules', framed([
    '1. FEEL ONE COMING? ENTER THE ROOM.', '2. CLOSE THE MAIN DOOR.', '3. OPEN THE PORTHOLES.', '4. NO BEANS INSIDE.', '5. NO BANKING.',
    '6. NO SASH-FLUTTER DEMONSTRATIONS.', '7. ONE STENCHMASTER AT A TIME.', '8. NO RHETORICAL INSULTS NEAR BROGATH.', "9. DO NOT ASK, 'IS THAT ALL?'",
    '10. SPECTATORS BEHIND THE ROPE.', '11. TWO AT ONCE: SECOND ONE UPWIND.'], { title: 'STENCHMASTER FART ZONE: RULES', titleBg: '#7a1a1a' }));
  atlas.add('dispensary_sign', framed(['THE GRAND DISPENSARY', '', 'MELLOW WAFTS, JARRED', 'BY APPOINTMENT TO NOBODY', '', 'PAY IN GRAND TOKENS ONLY'], { bg: PURPLE.d, fg: GOLDC.l, border: GOLDC.m }));
  atlas.add('visor_badge', framed(['THE GRAND DISPENSARY', 'HELLO!', "I'M HAPPY TO SERVE YOU", '', '(CAPTAIN STINKBEARD)'], { bg: GOLDC.m, border: GOLDC.d }));
  atlas.add('converter_receipt', noteCard(['GRAND CURRENCY CONVERSION', '', 'INPUT: 1 GRAND TOKEN', 'OUTPUT: 1 COFFIN SOCK', '(ATMOSPHERIC EQUIVALENT)', 'STATUS: DELIVERED', 'FEE: 1 GRAND TOKEN', '', 'THANK YOU FOR CONVERTING']));
  atlas.add('converter_policy', framed(['THE GRAND CURRENCY CONVERTER', '', 'AIR QUALITY POLICY:', 'NO MORE THAN 1,000 TOKENS', 'PER CONVERSION.', '', 'BY ORDER OF THE CAPTAIN.', '(AND HIS NOSE.)'], { title: 'NOTICE', titleBg: '#7a1a1a' }));
  atlas.add('sashback_card', framed(['GRAND SASHBACK REWARDS', '', 'THE FOULER THE SASH,', 'THE BETTER THE CREDIT.', '', 'MEMBER SINCE: JUST NOW'], { bg: PURPLE.m, fg: GOLDC.l, border: GOLDC.m }));
  atlas.add('rancidella_approval', noteCard(['LADY RANCIDELLA', 'GRAND CREDIT SCORE: 998', 'CLASS: RAUNCHY / EXCELLENT', '', 'WELCOME BONUS:', '50,000 GRAND TOKENS', 'REDEEMABLE AT THE CONVERTER']));
  atlas.add('bzz_approval', noteCard(['APPLICANT: BZBZBZBZZZZ-7', 'COLLATERAL: ONE (1) STRAND', "OF STINKBEARD'S BEARD", '', 'GRAND CREDIT SCORE: 999', 'STATUS: APPROVED', '(PREFERRED CUSTOMER)']));
  atlas.add('hornet_preferred', framed(['THE GRAND BANK AND GRAND TRUST', 'IS PROUD TO ANNOUNCE', 'ITS NEW', 'PREFERRED CUSTOMER SEGMENT:', '', 'HORNETS.'], { title: 'ANNOUNCEMENT', titleBg: PURPLE.m }));
  atlas.add('stingbeard_bulletin', framed(['STINGBEARD!', '', 'CAPTAIN OF THE REVENGE', 'NOW HOME TO A SWARM', '', 'HE SAYS IT IS TEMPORARY.', 'THE SWARM SAYS BZZ.'], { title: 'THE SHIP BULLETIN', titleBg: '#6a3a2a' }));
  atlas.add('bunker_sign', sign(['FART-FREE ZONE', '(REINFORCED)', 'NOW A BUNKER.', 'NO HORNETS.', 'NO BANKERS.', 'NO EXCEPTIONS (EXCEPT GARRICK).']));
  atlas.add('application_p1', form('1', 'APPLICATION FOR CEREMONIAL IGNITION', ['APPLICANT: LORD NICOTINIUS', 'PUFFCHESTER THE THIRD', '(PAGE 1 OF 97)']));
  atlas.add('application_p61', form('61', 'NEARBY LIVESTOCK', ['CHICKENS NEARBY: AGNES THE SECOND.', 'OPERATIONALLY IMPORTANT.', 'DO NOT TOAST.']));
  atlas.add('application_stamp', framed(['PRE-IGNITION', 'REVIEW REQUIRED'], { bg: '#f4ecd8', fg: '#a8241c', border: '#a8241c' }));
  atlas.add('council_ruling', noteCard(['THE GRAND IGNITION COUNCIL', '', 'APPLICATION: APPROVED', 'IGNITION TO BE PERFORMED BY:', 'GRAND STENCHMISTRESS', 'VINDICTA THUNDERWAFT', '(CEREMONIAL FIRE-WAFT)']));
  atlas.add('pocket_emergency_light', pocketPage('THE EMERGENCY LIGHT.|WHEN THE ANCIENTS NEEDED A FLAME,|THEY HAD TWO CHOICES:||1. A CEREMONIAL FIRE-WAFT.|2. ASK SOMEBODY ELSE.||MOST ASKED SOMEBODY ELSE.', { title: 'VOL. IX: THE EMERGENCY LIGHT' }));
}

export const PHASE16_INSERT_NAMES = [
  'lighter_box', 'lighter_instructions', 'bbk_coffin_sock', 'fz_warning', 'fz_rules', 'dispensary_sign', 'visor_badge', 'converter_receipt',
  'converter_policy', 'sashback_card', 'rancidella_approval', 'bzz_approval', 'hornet_preferred', 'stingbeard_bulletin', 'bunker_sign',
  'application_p1', 'application_p61', 'application_stamp', 'council_ruling', 'pocket_emergency_light',
];
