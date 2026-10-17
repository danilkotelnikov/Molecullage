"""Numbers shared by the scripts of gallery piece 06-gpcr-snake-plot: the page grid, in millimetres from the top-left corner of the page."""
W = 178.0                 # page width
H = 201.5                 # page height (set by the taller of the two blocks, see layout.py and make_plots.py)
M = 1.5                   # outer margin
XL0, XL1 = 1.5, 100.5     # left block (a snake plot, b 3D view): left and right edge
XR0, XR1 = 104.5, 176.5   # right block (c dot plot)
TITLE_DX, TITLE_DT = 4.6, 2.2          # panel letter to title text; title row centre below the top of its panel
SUB_DT = (5.8, 9.0)                    # centre rows of the sub-lines
T_SNAKE = 21.5            # page t of the highest point of the snake plot
INK, SUB, GUIDE = "#0A0A0A", "#2B2B2B", "#777777"
