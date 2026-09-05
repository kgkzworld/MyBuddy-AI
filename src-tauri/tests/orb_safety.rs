use ambient_desktop_agent_lib::orb::{
    ORB_MAX_PIXELS, OrbBounds, orb_gradient_color, orb_size_for_dpi,
};

#[test]
fn orb_scales_with_dpi_but_never_exceeds_the_hard_cap() {
    assert_eq!(orb_size_for_dpi(96), 76);
    assert_eq!(orb_size_for_dpi(192), 152);
    assert_eq!(orb_size_for_dpi(480), ORB_MAX_PIXELS);
}

#[test]
fn orb_bounds_must_stay_small_and_inside_the_monitor_work_area() {
    let work_area = OrbBounds::new(0, 0, 3840, 2080);

    assert!(OrbBounds::new(3664, 1856, 152, 152).is_safe_within(work_area));
    assert!(!OrbBounds::new(0, 0, ORB_MAX_PIXELS + 1, 152).is_safe_within(work_area));
    assert!(!OrbBounds::new(3800, 2000, 152, 152).is_safe_within(work_area));
}

#[test]
fn orb_gradient_preserves_the_original_cyan_violet_pink_palette() {
    assert_eq!(orb_gradient_color(0.0), (46, 208, 239));
    assert_eq!(orb_gradient_color(1.0 / 3.0), (102, 87, 232));
    assert_eq!(orb_gradient_color(2.0 / 3.0), (170, 93, 232));
    assert_eq!(orb_gradient_color(1.0), (46, 208, 239));
}
