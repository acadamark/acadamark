import math
import random

random.seed(42)  # deterministic

# Generate scatter data: y = 2 + 0.7x + noise
n_points = 30
x_min, x_max = 0, 20
data = []
for _ in range(n_points):
    x = random.uniform(x_min, x_max)
    y = 2 + 0.7 * x + random.gauss(0, 1.5)
    data.append((x, y))

# Compute regression
x_vals = [p[0] for p in data]
y_vals = [p[1] for p in data]
x_bar = sum(x_vals) / n_points
y_bar = sum(y_vals) / n_points
num = sum((x - x_bar) * (y - y_bar) for x, y in data)
den = sum((x - x_bar) ** 2 for x in x_vals)
beta_1 = num / den
beta_0 = y_bar - beta_1 * x_bar

# SVG dimensions
width, height = 500, 350
margin_left = 50
margin_right = 20
margin_top = 30
margin_bottom = 40

plot_width = width - margin_left - margin_right
plot_height = height - margin_top - margin_bottom

# Data ranges
y_min, y_max = 0, 18
x_plot_min, x_plot_max = 0, 20

def x_to_svg(x):
    return margin_left + (x - x_plot_min) / (x_plot_max - x_plot_min) * plot_width

def y_to_svg(y):
    return margin_top + plot_height - (y - y_min) / (y_max - y_min) * plot_height

# Build SVG
svg_parts = []
svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" font-family="Georgia, serif">')

# Background
svg_parts.append(f'<rect width="{width}" height="{height}" fill="#fafafa"/>')

# Grid lines
for i in range(0, 21, 5):
    sx = x_to_svg(i)
    svg_parts.append(f'<line x1="{sx}" y1="{margin_top}" x2="{sx}" y2="{margin_top + plot_height}" stroke="#e0e0e0" stroke-width="0.5"/>')

for i in range(0, 19, 3):
    sy = y_to_svg(i)
    svg_parts.append(f'<line x1="{margin_left}" y1="{sy}" x2="{margin_left + plot_width}" y2="{sy}" stroke="#e0e0e0" stroke-width="0.5"/>')

# Axes
svg_parts.append(f'<line x1="{margin_left}" y1="{margin_top + plot_height}" x2="{margin_left + plot_width}" y2="{margin_top + plot_height}" stroke="#333" stroke-width="1.5"/>')
svg_parts.append(f'<line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{margin_top + plot_height}" stroke="#333" stroke-width="1.5"/>')

# Tick labels - x
for i in range(0, 21, 5):
    sx = x_to_svg(i)
    svg_parts.append(f'<line x1="{sx}" y1="{margin_top + plot_height}" x2="{sx}" y2="{margin_top + plot_height + 4}" stroke="#333" stroke-width="1"/>')
    svg_parts.append(f'<text x="{sx}" y="{margin_top + plot_height + 18}" text-anchor="middle" font-size="11" fill="#333">{i}</text>')

# Tick labels - y
for i in range(0, 19, 3):
    sy = y_to_svg(i)
    svg_parts.append(f'<line x1="{margin_left}" y1="{sy}" x2="{margin_left - 4}" y2="{sy}" stroke="#333" stroke-width="1"/>')
    svg_parts.append(f'<text x="{margin_left - 8}" y="{sy + 4}" text-anchor="end" font-size="11" fill="#333">{i}</text>')

# Axis labels
svg_parts.append(f'<text x="{margin_left + plot_width / 2}" y="{height - 8}" text-anchor="middle" font-size="13" fill="#333" font-style="italic">x</text>')
svg_parts.append(f'<text x="14" y="{margin_top + plot_height / 2}" text-anchor="middle" font-size="13" fill="#333" font-style="italic" transform="rotate(-90 14 {margin_top + plot_height / 2})">y</text>')

# Regression line
x_line_min, x_line_max = 0, 20
y_line_min = beta_0 + beta_1 * x_line_min
y_line_max = beta_0 + beta_1 * x_line_max
svg_parts.append(f'<line x1="{x_to_svg(x_line_min)}" y1="{y_to_svg(y_line_min)}" x2="{x_to_svg(x_line_max)}" y2="{y_to_svg(y_line_max)}" stroke="#c0392b" stroke-width="2"/>')

# Data points
for x, y in data:
    sx = x_to_svg(x)
    sy = y_to_svg(y)
    svg_parts.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="3.5" fill="#2c5282" fill-opacity="0.7" stroke="#1a365d" stroke-width="0.5"/>')

# Equation annotation
eq_text = f'ŷ = {beta_0:.2f} + {beta_1:.2f}x'
svg_parts.append(f'<text x="{margin_left + plot_width - 10}" y="{margin_top + 20}" text-anchor="end" font-size="12" fill="#c0392b" font-style="italic">{eq_text}</text>')

svg_parts.append('</svg>')

with open('scatter-regression.svg', 'w') as f:
    f.write('\n'.join(svg_parts))

print(f'Generated scatter-regression.svg with {n_points} points')
print(f'Regression: y = {beta_0:.3f} + {beta_1:.3f}x')
