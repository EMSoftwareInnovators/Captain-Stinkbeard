/**
 * Story Phase 14: what the F2 "Brogath" tab offers (development builds only).
 * Jumps are debug presets (data/debug/presets.json); scenes are a few script
 * steps that call the chapter scripts in whatever room you're in, so a
 * set-piece can be replayed without walking back to it.
 */
export const DEBUG_BROGATH = {
  jumps: [
    ['Return of Brogath (ch 146)', 'p14_start'],
    ['Brogath returns (ch 148)', 'p14_brogath_returns'],
    ['Flutter incidents (ch 150)', 'p14_flutter_lessons'],
    ['Apology Eruption (ch 151)', 'p14_apology_eruption'],
    ['Suspension ends (ch 152)', 'p14_back_in_office'],
    ['Rivalry (ch 153)', 'p14_two_stenchmasters'],
    ['Bean breakfast (ch 154)', 'p14_bean_breakfast'],
    ['Fart-Free Zone (ch 155)', 'p14_fart_free_zone'],
    ['Bad Money (ch 159)', 'p14_bad_money'],
    ['Television duty (ch 161)', 'p14_television_duty'],
    ['Grand Bank (ch 163)', 'p14_grand_bank'],
    ['Teller shift (ch 164)', 'p14_teller_shift'],
    ['Grandmother Gustilda (ch 165)', 'p14_gustilda'],
    ['Ten-minute catastrophe (ch 167)', 'p14_catastrophe'],
    ['Disposal research (ch 168)', 'p14_brogath_problem'],
    ['Possessed TV (ch 169)', 'p14_history_night'],
    ['Phase 14 complete', 'p14_complete'],
  ],
  scenes: [
    ['Trigger a flutter incident', [{ stability: 'incident', id: 'debug_flutter' }]],
    ['Trigger his first eruption', [{ call: 'p14.eruption_small' }]],
    ['Trigger the Apology Eruption', [{ call: 'p14.eruption_apology' }]],
    ['Trigger the ten-minute catastrophe', [{ call: 'p14.eruption_catastrophe' }]],
    ['End Garrick\'s suspension', [{ setFlag: ['stenchmaster_suspension_over'] }, { clearFlag: ['stenchmaster_suspension_active'] }, { setVar: 'suspension_hours_left', value: 0 }]],
    ['Open the Grand Bank', [{ setFlag: ['grand_bank_open'] }]],
    ['Close the Grand Bank', [{ clearFlag: ['grand_bank_open'] }]],
    ['Serve Grandmother Gustilda', [{ setFlag: ['grand_bank_open'] }, { bankDeposit: 'gustilda' }]],
    ['Start the possessed television', [{ call: 'p14.tv_possessed' }]],
  ],
};
