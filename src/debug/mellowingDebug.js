/**
 * Story Phase 15: what the F2 "Mellow" tab offers (development builds only).
 * Jumps are debug presets (data/debug/presets.json), so a jump into a later
 * scene brings every prerequisite with it; scenes are a few script steps run
 * in whatever room you're in. Nothing here writes a save by itself.
 */
const ANCIENT_LORE = ['ancient_lore_ledger', 'ancient_lore_tilda', 'ancient_lore_ned', 'ancient_lore_harold', 'ancient_lore_clem', 'ancient_lore_lost', 'ancient_lore_elsie'];

export const DEBUG_MELLOWING = {
  jumps: [
    ['Start the phase (ch 170)', 'p15_start'],
    ['Top Ten flutters (ch 171)', 'p15_top_ten'],
    ['Family of idiots (ch 172)', 'p15_family'],
    ['Economic recovery (ch 173)', 'p15_economic_recovery'],
    ['Creative conversion (ch 174)', 'p15_creative_conversion'],
    ['The visitors (ch 175)', 'p15_visitors'],
    ['Chicken incident (ch 176)', 'p15_chicken_incident'],
    ['Grand Paranoia (ch 177)', 'p15_grand_paranoia'],
    ['Grand Nap (ch 178)', 'p15_grand_nap'],
    ['Nose-fire waft (ch 179)', 'p15_nose_fire'],
    ['Bashfulness Branch (ch 180)', 'p15_bashfulness_branch'],
    ['Great Mellowing (ch 181)', 'p15_great_mellowing'],
    ['Untold Stories (ch 182)', 'p15_untold_stories'],
    ['Relief teller shift (ch 183)', 'p15_relief_teller'],
    ['Relief queue: Gary', 'p15_relief_gary'],
    ['Relief queue: Farthelmew', 'p15_relief_farthelmew'],
    ['Whifflebottom loan (ch 184)', 'p15_sash_loan'],
    ['The fart he misses (ch 185)', 'p15_the_fart_he_misses'],
    ['Phase 15 complete', 'p15_complete'],
  ],
  /** Episodes to play on the Mark II (in the galley's watching view). */
  episodes: ['age_of_fart_commerce', 'top_ten_flutters', 'goat_incident', 'wrath_of_brogath', 'chicken_incident', 'untold_stories'],
  scenes: [
    ['TV: Stenchmaster Channel ON', [{ setValue: 'ses_mk2_state', value: 'possessed' }, { setVar: 'ses_mk2_power', value: 1 }, { sfx: 'tv_power_on', volume: 0.8 }]],
    ['TV: gutted (OFF, for now)', [{ setValue: 'ses_mk2_state', value: 'gutted' }, { setVar: 'ses_mk2_power', value: 0 }, { setFlag: ['tv_destroyed_again', 'mk2_parts_on_floor'] }, { sfx: 'tv_power_off', volume: 0.8 }]],
    ['TV: possessed reactivation', [{ setValue: 'ses_mk2_state', value: 'possessed' }, { setVar: 'ses_mk2_power', value: 1 }, { setFlag: ['tv_possessed_reactivation'] }, { sfx: 'tube_warmup', volume: 0.7 }]],
    ['Skunk vision (hallucination)', [{ setFlag: ['p15_skunk_vision'] }, { atmosphere: 'BROGATH_SKUNK_HAZE' }]],
    ['Beard paranoia (hallucination)', [{ setFlag: ['p15_beard_paranoia'] }, { atmosphere: 'BEARD_PARANOIA_HAZE' }, { setVar: 'threat_level', value: 1 }]],
    ['Clear hallucinations', [{ clearFlag: ['p15_skunk_vision', 'p15_beard_paranoia', 'stinkbeard_delirium'] }, { setVar: 'threat_level', value: 0 }]],
    ['Mark ancient crew lore read', [{ setFlag: ANCIENT_LORE }]],
    ['Grand Currency: 20,000 tokens', [{ setVar: 'grand_currency_tokens', value: 20000 }]],
    ['Grand Currency: none', [{ setVar: 'grand_currency_tokens', value: 0 }]],
    ['Emergency reserve: 7 doubloons', [{ setVar: 'captain_emergency_reserve', value: 7 }, { setFlag: ['captain_reserve_counted'] }]],
    ['Economic Anger Waft (converts once)', [{ sfx: 'anger_waft', volume: 0.9 }, { shake: 4, duration: 1200 }, { convert: 'economic_anger_waft' }, { setFlag: ['skunk_weed_cargo'] }]],
    ['Grant Skunk Weed cargo (+10 lots)', [{ addVar: 'skunk_weed_lots', value: 10 }, { setFlag: ['skunk_weed_cargo'] }, { giveItem: 'skunk_cargo_manifest', silent: true }]],
    ['Visitors: aboard (spawn here)', 'visitors'],
    ['Visitors: gone', [{ clearFlag: ['modern_visitors_aboard'] }, { despawn: 'visitor_one' }, { despawn: 'visitor_two' }]],
    ['Roaring pillow (old quarters)', [{ setVar: 'pillow_spot', value: 1 }]],
    ['Branch: open', [{ setValue: 'bashfulness_branch_state', value: 'open' }, { atmosphere: 'BANK_FUMES' }, { sfx: 'bank_materialise', volume: 0.7 }]],
    ['Branch: flickering', [{ setValue: 'bashfulness_branch_state', value: 'flickering' }]],
    ['Branch: closing', [{ setValue: 'bashfulness_branch_state', value: 'closing' }]],
    ['Branch: closed (for good)', [{ setValue: 'bashfulness_branch_state', value: 'closed' }, { setFlag: ['bashfulness_branch_closed_for_good'] }]],
    ['Great Mellowing', [{ atmosphere: 'MELLOW_HAZE' }, { sharkstorm: 'mellow_clambake' }, { setFlag: ['great_mellowing'] }, { sfx: 'skunk_waft_big', volume: 0.8 }]],
    ['Agnes the Second: aboard (spawn here)', 'agnes'],
    ['Agnes the Second: missing in the Sharkstorm', [{ clearFlag: ['agnes_second_on_ship'] }, { setFlag: ['agnes_second_missing_in_sharkstorm'] }, { despawn: 'agnes_second' }]],
    ['Vindicta clears the haze', [{ sfx: 'anger_waft', volume: 0.9 }, { shake: 5, duration: 1400 }, { atmosphere: 'CLEARING' }, { wait: 800 }, { atmosphere: 'ORDINARY_STENCH' }, { sharkstorm: 'rough_turbulence' }, { setFlag: ['p15_haze_cleared', 'great_mellowing_cleared'] }]],
  ],
};
