// Prevents a spawned console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    emdi_lib::run();
}
