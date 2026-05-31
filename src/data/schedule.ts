import type { ExerciseInfo, WorkoutInfo, ScheduleDay } from '../types';

export const exercises: ExerciseInfo[] = [
  // --- CHEST & BACK ---
  { id: 'cb_standard_pushup', name: 'Standard Push-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_wide_front_pullup', name: 'Wide Front Pull-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_military_pushup', name: 'Military Push-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_reverse_grip_chinup', name: 'Reverse Grip Chin-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_wide_fly_pushup', name: 'Wide Fly Push-ups', type: 'bodyweight', setCount: 2 },
  {
    id: 'cb_closed_grip_pullup',
    name: 'Closed Grip Overhand Pull-ups',
    type: 'bodyweight',
    setCount: 2,
  },
  { id: 'cb_decline_pushup', name: 'Decline Push-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_heavy_pants', name: 'Heavy Pants', type: 'weighted', setCount: 2 },
  { id: 'cb_diamond_pushup', name: 'Diamond Push-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_lawnmower', name: 'Lawnmowers', type: 'weighted', setCount: 2 },
  { id: 'cb_divebomber_pushup', name: 'Dive-bomber Push-ups', type: 'bodyweight', setCount: 2 },
  { id: 'cb_back_fly', name: 'Back Flys', type: 'weighted', setCount: 2 },

  // --- SHOULDERS & ARMS ---
  {
    id: 'sa_alt_shoulder_press',
    name: 'Alternating Shoulder Presses',
    type: 'weighted',
    setCount: 2,
  },
  { id: 'sa_in_out_curl', name: 'In & Out Bicep Curls', type: 'weighted', setCount: 2 },
  { id: 'sa_two_arm_kickback', name: 'Two-arm Tricep Kickbacks', type: 'weighted', setCount: 2 },
  { id: 'sa_deep_swimmer_press', name: "Deep Swimmer's Presses", type: 'weighted', setCount: 2 },
  {
    id: 'sa_full_supination_curl',
    name: 'Full Supination Concentration Curls',
    type: 'weighted',
    setCount: 2,
  },
  { id: 'sa_chair_dip', name: 'Chair Dips', type: 'bodyweight', setCount: 2 },
  { id: 'sa_upright_row', name: 'Upright Rows', type: 'weighted', setCount: 2 },
  { id: 'sa_static_arm_curl', name: 'Static Arm Curls', type: 'weighted', setCount: 2 },
  {
    id: 'sa_flip_grip_kickback',
    name: 'Flip-grip Twist Tricep Kickbacks',
    type: 'weighted',
    setCount: 2,
  },
  { id: 'sa_two_angle_fly', name: 'Two-angle Shoulder Flys', type: 'weighted', setCount: 2 },
  { id: 'sa_crouching_cohen_curl', name: 'Crouching Cohen Curls', type: 'weighted', setCount: 2 },
  { id: 'sa_lying_down_ext', name: 'Lying-down Tricep Extensions', type: 'weighted', setCount: 2 },
  {
    id: 'sa_straight_arm_fly',
    name: 'In & Out Straight-arm Shoulder Flys',
    type: 'weighted',
    setCount: 2,
  },
  { id: 'sa_congdon_curl', name: 'Congdon Curls', type: 'weighted', setCount: 2 },
  { id: 'sa_side_tri_rise', name: 'Side Tri-rises', type: 'bodyweight', setCount: 2 },

  // --- LEGS & BACK ---
  { id: 'lb_balanced_lunge', name: 'Balanced Lunges', type: 'weighted', setCount: 1 },
  { id: 'lb_calf_raise_squat', name: 'Calf Raise Squats', type: 'weighted', setCount: 1 },
  { id: 'lb_rev_grip_chinup', name: 'Reverse Grip Chin-ups', type: 'bodyweight', setCount: 1 },
  { id: 'lb_super_skater', name: 'Super Skaters', type: 'bodyweight', setCount: 1 },
  { id: 'lb_wall_squat', name: 'Wall Squat', type: 'bodyweight', setCount: 1 },
  { id: 'lb_wide_front_pullup', name: 'Wide Front Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'lb_step_back_lunge', name: 'Step Back Lunges', type: 'weighted', setCount: 1 },
  { id: 'lb_alt_side_lunge', name: 'Alternating Side Lunges', type: 'weighted', setCount: 1 },
  {
    id: 'lb_close_grip_pullup',
    name: 'Close Grip Overhead Pull-ups',
    type: 'bodyweight',
    setCount: 1,
  },
  {
    id: 'lb_single_leg_wall_squat',
    name: 'Single Leg Wall Squat',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'lb_dead_lift_squat', name: 'Dead Lift Squats', type: 'weighted', setCount: 1 },
  { id: 'lb_switch_grip_pullup', name: 'Switch Grip Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'lb_three_way_lunge', name: 'Three-way Lunge', type: 'weighted', setCount: 1 },
  { id: 'lb_sneaky_lunge', name: 'Sneaky Lunge', type: 'weighted', setCount: 1 },
  {
    id: 'lb_rev_grip_chinup_rep',
    name: 'Reverse Grip Chin-ups (Repeat)',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'lb_chair_salutation', name: 'Chair Salutations', type: 'bodyweight', setCount: 1 },
  { id: 'lb_toe_row_lunge', name: 'Toe Row Iso Lunge', type: 'weighted', setCount: 1 },
  {
    id: 'lb_wide_front_pullup_rep',
    name: 'Wide Front Pull-ups (Repeat)',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'lb_groucho_walk', name: 'Groucho Walk', type: 'weighted', setCount: 1 },
  { id: 'lb_calf_raise', name: 'Calf Raises', type: 'weighted', setCount: 1 },
  {
    id: 'lb_close_grip_pullup_rep',
    name: 'Close Grip Overhead Pull-ups (Repeat)',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'lb_speed_squat', name: '80-20 Seibers Speed Squat', type: 'weighted', setCount: 1 },
  {
    id: 'lb_switch_grip_pullup_rep',
    name: 'Switch Grip Pull-ups (Repeat)',
    type: 'bodyweight',
    setCount: 1,
  },

  // --- CHEST, SHOULDERS & TRICEPS ---
  { id: 'cst_slo_mo_3in1', name: 'Slow motion 3-in-1 Push-ups', type: 'bodyweight', setCount: 1 },
  { id: 'cst_in_out_fly', name: 'In & Out Shoulder Flys', type: 'weighted', setCount: 1 },
  { id: 'cst_chair_dip', name: 'Chair Dips', type: 'bodyweight', setCount: 1 },
  { id: 'cst_plange_pushup', name: 'Plange Push-ups', type: 'bodyweight', setCount: 1 },
  { id: 'cst_pike_press', name: 'Pike Presses', type: 'bodyweight', setCount: 1 },
  { id: 'cst_side_tri_rise', name: 'Side Tri-rises', type: 'bodyweight', setCount: 1 },
  { id: 'cst_floor_fly', name: 'Floor Flys', type: 'weighted', setCount: 1 },
  { id: 'cst_scarecrow', name: 'Scarecrows', type: 'weighted', setCount: 1 },
  { id: 'cst_overhead_ext', name: 'Overhead Tricep Extensions', type: 'weighted', setCount: 1 },
  {
    id: 'cst_two_twitch_pushup',
    name: 'Two-twitch Speed Push-ups',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'cst_y_press', name: 'Y-Presses', type: 'weighted', setCount: 1 },
  { id: 'cst_lying_ext', name: 'Lying Tricep Extensions', type: 'weighted', setCount: 1 },
  { id: 'cst_side_to_side_pushup', name: 'Side-to-side Push-ups', type: 'bodyweight', setCount: 1 },
  { id: 'cst_pour_fly', name: 'Pour Flys', type: 'weighted', setCount: 1 },
  {
    id: 'cst_side_leaning_ext',
    name: 'Side-leaning Tricep Extensions',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'cst_one_arm_pushup', name: 'One-arm Push-ups', type: 'bodyweight', setCount: 1 },
  { id: 'cst_weighted_circle', name: 'Weighted Circles', type: 'weighted', setCount: 1 },
  { id: 'cst_throw_bomb', name: 'Throw the Bomb', type: 'weighted', setCount: 1 },
  { id: 'cst_clap_pushup', name: 'Clap or Plyo Push-ups', type: 'bodyweight', setCount: 1 },
  { id: 'cst_slomo_throw', name: 'Slo-mo Throws', type: 'weighted', setCount: 1 },
  {
    id: 'cst_front_back_ext',
    name: 'Front-to-back Tricep Extensions',
    type: 'weighted',
    setCount: 1,
  },
  {
    id: 'cst_one_arm_balance_pushup',
    name: 'One-arm Balance Push-ups',
    type: 'bodyweight',
    setCount: 1,
  },
  { id: 'cst_fly_row_press', name: 'Fly row Presses', type: 'weighted', setCount: 1 },
  { id: 'cst_cross_body_blow', name: 'Dumbell Cross-body Blows', type: 'weighted', setCount: 1 },

  // --- BACK & BICEPS ---
  { id: 'bb_wide_front_pullup', name: 'Wide Front Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'bb_lawnmower', name: 'Lawnmowers', type: 'weighted', setCount: 1 },
  { id: 'bb_twenty_one', name: 'Twenty ones', type: 'weighted', setCount: 1 },
  { id: 'bb_one_arm_cross_curl', name: 'One-arm Cross-body Curls', type: 'weighted', setCount: 1 },
  { id: 'bb_switch_grip_pullup', name: 'Switch Grip Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'bb_elbows_out_row', name: 'Elbows-out Lawnmowers', type: 'weighted', setCount: 1 },
  { id: 'bb_standing_curl', name: 'Standing Bicep Curls', type: 'weighted', setCount: 1 },
  {
    id: 'bb_one_arm_conc_curl',
    name: 'One-arm Concentration Curls',
    type: 'weighted',
    setCount: 1,
  },
  { id: 'bb_corn_cob_pullup', name: 'Corn Cob Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'bb_rev_grip_row', name: 'Reverse Grip Bent-over Rows', type: 'weighted', setCount: 1 },
  { id: 'bb_open_arm_curl', name: 'Open Arm Curls', type: 'weighted', setCount: 1 },
  { id: 'bb_static_arm_curl', name: 'Static Arm Curls', type: 'weighted', setCount: 1 },
  { id: 'bb_towel_pullup', name: 'Towel Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'bb_congdon_locomotive', name: 'Congdon Locomotives', type: 'weighted', setCount: 1 },
  { id: 'bb_crouching_cohen_curl', name: 'Crouching Cohen Curls', type: 'weighted', setCount: 1 },
  {
    id: 'bb_one_arm_corkscrew_curl',
    name: 'One Arm Corkscrew Curls',
    type: 'weighted',
    setCount: 1,
  },
  { id: 'bb_chinup', name: 'Chin-ups', type: 'bodyweight', setCount: 1 },
  { id: 'bb_seated_back_fly', name: 'Seated Bent-over Back Flys', type: 'weighted', setCount: 1 },
  { id: 'bb_curl_up_hammer_down', name: 'Curl-up/Hammer Downs', type: 'weighted', setCount: 1 },
  { id: 'bb_hammer_curl', name: 'Hammer Curls', type: 'weighted', setCount: 1 },
  { id: 'bb_max_rep_pullup', name: 'Max Rep Pull-ups', type: 'bodyweight', setCount: 1 },
  { id: 'bb_superman', name: 'Superman', type: 'bodyweight', setCount: 1 },
  { id: 'bb_in_out_hammer_curl', name: 'In-Out Hammer Curls', type: 'weighted', setCount: 1 },
  { id: 'bb_strip_set_curl', name: 'Strip Set Curls', type: 'weighted', setCount: 1 },
];

export const workouts: WorkoutInfo[] = [
  {
    id: 'chest_and_back',
    name: 'Chest & Back',
    type: 'resistance',
    exercises: [
      'cb_standard_pushup',
      'cb_wide_front_pullup',
      'cb_military_pushup',
      'cb_reverse_grip_chinup',
      'cb_wide_fly_pushup',
      'cb_closed_grip_pullup',
      'cb_decline_pushup',
      'cb_heavy_pants',
      'cb_diamond_pushup',
      'cb_lawnmower',
      'cb_divebomber_pushup',
      'cb_back_fly',
    ],
    abRipper: true,
  },
  {
    id: 'shoulders_and_arms',
    name: 'Shoulders & Arms',
    type: 'resistance',
    exercises: [
      'sa_alt_shoulder_press',
      'sa_in_out_curl',
      'sa_two_arm_kickback',
      'sa_deep_swimmer_press',
      'sa_full_supination_curl',
      'sa_chair_dip',
      'sa_upright_row',
      'sa_static_arm_curl',
      'sa_flip_grip_kickback',
      'sa_two_angle_fly',
      'sa_crouching_cohen_curl',
      'sa_lying_down_ext',
      'sa_straight_arm_fly',
      'sa_congdon_curl',
      'sa_side_tri_rise',
    ],
    abRipper: true,
  },
  {
    id: 'legs_and_back',
    name: 'Legs & Back',
    type: 'resistance',
    exercises: [
      'lb_balanced_lunge',
      'lb_calf_raise_squat',
      'lb_rev_grip_chinup',
      'lb_super_skater',
      'lb_wall_squat',
      'lb_wide_front_pullup',
      'lb_step_back_lunge',
      'lb_alt_side_lunge',
      'lb_close_grip_pullup',
      'lb_single_leg_wall_squat',
      'lb_dead_lift_squat',
      'lb_switch_grip_pullup',
      'lb_three_way_lunge',
      'lb_sneaky_lunge',
      'lb_rev_grip_chinup_rep',
      'lb_chair_salutation',
      'lb_toe_row_lunge',
      'lb_wide_front_pullup_rep',
      'lb_groucho_walk',
      'lb_calf_raise',
      'lb_close_grip_pullup_rep',
      'lb_speed_squat',
      'lb_switch_grip_pullup_rep',
    ],
    abRipper: true,
  },
  {
    id: 'chest_shoulders_triceps',
    name: 'Chest, Shoulders & Triceps',
    type: 'resistance',
    exercises: [
      'cst_slo_mo_3in1',
      'cst_in_out_fly',
      'cst_chair_dip',
      'cst_plange_pushup',
      'cst_pike_press',
      'cst_side_tri_rise',
      'cst_floor_fly',
      'cst_scarecrow',
      'cst_overhead_ext',
      'cst_two_twitch_pushup',
      'cst_y_press',
      'cst_lying_ext',
      'cst_side_to_side_pushup',
      'cst_pour_fly',
      'cst_side_leaning_ext',
      'cst_one_arm_pushup',
      'cst_weighted_circle',
      'cst_throw_bomb',
      'cst_clap_pushup',
      'cst_slomo_throw',
      'cst_front_back_ext',
      'cst_one_arm_balance_pushup',
      'cst_fly_row_press',
      'cst_cross_body_blow',
    ],
    abRipper: true,
  },
  {
    id: 'back_and_biceps',
    name: 'Back & Biceps',
    type: 'resistance',
    exercises: [
      'bb_wide_front_pullup',
      'bb_lawnmower',
      'bb_twenty_one',
      'bb_one_arm_cross_curl',
      'bb_switch_grip_pullup',
      'bb_elbows_out_row',
      'bb_standing_curl',
      'bb_one_arm_conc_curl',
      'bb_corn_cob_pullup',
      'bb_rev_grip_row',
      'bb_open_arm_curl',
      'bb_static_arm_curl',
      'bb_towel_pullup',
      'bb_congdon_locomotive',
      'bb_crouching_cohen_curl',
      'bb_one_arm_corkscrew_curl',
      'bb_chinup',
      'bb_seated_back_fly',
      'bb_curl_up_hammer_down',
      'bb_hammer_curl',
      'bb_max_rep_pullup',
      'bb_superman',
      'bb_in_out_hammer_curl',
      'bb_strip_set_curl',
    ],
    abRipper: true,
  },
  {
    id: 'plyometrics',
    name: 'Plyometrics',
    type: 'cardio',
    exercises: [],
    abRipper: false,
  },
  {
    id: 'yoga_x',
    name: 'Yoga X',
    type: 'stretch',
    exercises: [],
    abRipper: false,
  },
  {
    id: 'kenpo_x',
    name: 'Kenpo X',
    type: 'cardio',
    exercises: [],
    abRipper: false,
  },
  {
    id: 'core_synergistics',
    name: 'Core Synergistics',
    type: 'cardio',
    exercises: [],
    abRipper: false,
  },
  {
    id: 'cardio_x',
    name: 'Cardio X',
    type: 'cardio',
    exercises: [],
    abRipper: false,
  },
  {
    id: 'x_stretch',
    name: 'X Stretch',
    type: 'stretch',
    exercises: [],
    abRipper: false,
  },
  {
    id: 'rest',
    name: 'Rest',
    type: 'stretch',
    exercises: [],
    abRipper: false,
  },
];

// Helper to construct the 91-day P90X Classic schedule calendar
export const generateClassicSchedule = (): ScheduleDay[] => {
  const schedule: ScheduleDay[] = [];

  const phase1ResistanceWeeks = [1, 2, 3];
  const phase2ResistanceWeeks = [5, 6, 7];
  const phase3ResistanceWeeks = [9, 10, 11, 12];
  const recoveryWeeks = [4, 8, 13];

  let dayNumber = 1;

  for (let week = 1; week <= 13; week++) {
    const isRecovery = recoveryWeeks.includes(week);
    const isPhase1 = phase1ResistanceWeeks.includes(week);
    const isPhase2 = phase2ResistanceWeeks.includes(week);
    const isPhase3 = phase3ResistanceWeeks.includes(week);

    for (let day = 1; day <= 7; day++) {
      let workoutId = 'rest';

      if (isRecovery) {
        // Recovery Weeks (4, 8, 13)
        switch (day) {
          case 1:
            workoutId = 'yoga_x';
            break;
          case 2:
            workoutId = 'core_synergistics';
            break;
          case 3:
            workoutId = 'kenpo_x';
            break;
          case 4:
            workoutId = 'x_stretch';
            break;
          case 5:
            workoutId = 'core_synergistics';
            break;
          case 6:
            workoutId = 'yoga_x';
            break;
          case 7:
            workoutId = 'rest';
            break;
        }
      } else if (isPhase1) {
        // Phase 1 (Weeks 1, 2, 3)
        switch (day) {
          case 1:
            workoutId = 'chest_and_back';
            break;
          case 2:
            workoutId = 'plyometrics';
            break;
          case 3:
            workoutId = 'shoulders_and_arms';
            break;
          case 4:
            workoutId = 'yoga_x';
            break;
          case 5:
            workoutId = 'legs_and_back';
            break;
          case 6:
            workoutId = 'kenpo_x';
            break;
          case 7:
            workoutId = 'rest';
            break;
        }
      } else if (isPhase2) {
        // Phase 2 (Weeks 5, 6, 7)
        switch (day) {
          case 1:
            workoutId = 'chest_shoulders_triceps';
            break;
          case 2:
            workoutId = 'plyometrics';
            break;
          case 3:
            workoutId = 'back_and_biceps';
            break;
          case 4:
            workoutId = 'yoga_x';
            break;
          case 5:
            workoutId = 'legs_and_back';
            break;
          case 6:
            workoutId = 'kenpo_x';
            break;
          case 7:
            workoutId = 'rest';
            break;
        }
      } else if (isPhase3) {
        // Phase 3 (Weeks 9, 10, 11, 12)
        // Alternates Weeks 9/11 (Phase 1 style) and Weeks 10/12 (Phase 2 style) for Mon/Wed resistance
        const isPhase1StyleWeek = week === 9 || week === 11;

        switch (day) {
          case 1:
            workoutId = isPhase1StyleWeek ? 'chest_and_back' : 'chest_shoulders_triceps';
            break;
          case 2:
            workoutId = 'plyometrics';
            break;
          case 3:
            isPhase1StyleWeek
              ? (workoutId = 'shoulders_and_arms')
              : (workoutId = 'back_and_biceps');
            break;
          case 4:
            workoutId = 'yoga_x';
            break;
          case 5:
            workoutId = 'legs_and_back';
            break;
          case 6:
            workoutId = 'kenpo_x';
            break;
          case 7:
            workoutId = 'rest';
            break;
        }
      }

      schedule.push({
        dayNumber,
        weekNumber: week,
        dayOfWeek: day,
        workoutId,
      });
      dayNumber++;
    }
  }

  return schedule;
};

export const p90xClassicSchedule = generateClassicSchedule();
