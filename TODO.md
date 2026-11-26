# TODO

## Font sizes in px (to review, nothing changed yet)

These styles use a fixed font size in px, which is too small on a 4K screen (see "Screen sizes" in the CLAUDE.md of the super-repo: base font size from the viewport, bounded by `clamp()`, other sizes in `em`). Before any change, check each component on every target viewport: the risk of a visual regression is real.

- `x-datetimepicker/x-datetimepicker.less`: lines 60, 80 (30px)
- `x-groupgrid/x-groupgrid.less`: line 52 (14px)
- `x-grouplist/x-grouplist.less`: line 49 (14px)
- `x-loginpassword/x-loginpassword.less`: lines 52 (14px), 94 (16px)
- `x-machineselection/x-machineselection.less`: lines 147 (6px), 288 (16px)
- `x-machinetabnav/x-machinetabnav.less`: line 50 (14px)
- `x-oeegauge/x-oeegauge.less`: line 62 (44px)
- `x-productionbar/x-productionbar.less`: line 29 (20px)
- `x-productiongauge/x-productiongauge.less`: line 88 (30px, overridden by `clamp()` in `oeeview.less`)
- `x-reasonslotlist/x-reasonslotlist.less`: line 135 (16px)
- `x-rotationprogress/x-rotationprogress.less`: line 38 (11px)
- `x-runningdialog/x-runningdialog.less`: lines 210 (18px), 218 (13px), 227 (20px)
- `x-task/x-task.less`: line 16 (21px)
