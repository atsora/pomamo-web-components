// Copyright (C) 2025 Atsora Solutions

/*
 * FR-specific configuration overrides.
 *
 * Use this file to override tagConfig or PULSE_DEFAULT_CONFIG values that need
 * a different default for French deployments — structural config only, not display text.
 *
 * Examples of what belongs here:
 *   tagConfig.someComponent.someValue = ...;
 *   PULSE_DEFAULT_CONFIG.general.someKey = ...;
 *
 * What does NOT belong here (and where it lives instead):
 *   - Role display labels     → ATSORA_LOCALE_CATALOG.fr.general.roles       (translation_component_default.js)
 *   - Tool selector labels    → ATSORA_LOCALE_CATALOG.fr.general.toolLabels  (translation_component_default.js)
 *   - Role noAccess flags     → PULSE_DEFAULT_CONFIG.roles[role].noAccess     (config_component_default.js)
 *   - Any other display text  → ATSORA_LOCALE_CATALOG.fr.*                   (translation_component_default.js)
 */
