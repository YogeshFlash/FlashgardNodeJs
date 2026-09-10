import 'package:flutter/material.dart';

/// A custom vector icon representing an automated vinyl/film cutting plotter.
/// Features a low-profile chassis, dual pinch rollers, horizontal guide rail,
/// tool carriage, and a sharp downward cutting blade on the film bed.
class CuttingPlotterIcon extends StatelessWidget {
  final double size;
  final Color? color;
  final bool isConnected;

  const CuttingPlotterIcon({
    super.key,
    this.size = 24,
    this.color,
    this.isConnected = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Theme.of(context).colorScheme.onSurface;

    return CustomPaint(
      size: Size(size, size),
      painter: _CuttingPlotterPainter(
        color: effectiveColor,
        isConnected: isConnected,
      ),
    );
  }
}

class _CuttingPlotterPainter extends CustomPainter {
  final Color color;
  final bool isConnected;

  _CuttingPlotterPainter({required this.color, this.isConnected = false});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24.0;

    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5 * scale
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // 1. Top chassis lid / housing (wide horizontal bar with rounded corners)
    final topLid = RRect.fromRectAndRadius(
      Rect.fromLTWH(2.5 * scale, 4.5 * scale, 19 * scale, 4 * scale),
      Radius.circular(2 * scale),
    );
    canvas.drawRRect(topLid, strokePaint);

    // 2. Left pillar (drive pod)
    final leftPillar = Path()
      ..moveTo(2.5 * scale, 8.5 * scale)
      ..lineTo(2.5 * scale, 17.5 * scale)
      ..lineTo(6.5 * scale, 17.5 * scale)
      ..lineTo(6.5 * scale, 8.5 * scale);
    canvas.drawPath(leftPillar, strokePaint);

    // 3. Right pillar (motor/control pod)
    final rightPillar = Path()
      ..moveTo(21.5 * scale, 8.5 * scale)
      ..lineTo(21.5 * scale, 17.5 * scale)
      ..lineTo(17.5 * scale, 17.5 * scale)
      ..lineTo(17.5 * scale, 8.5 * scale);
    canvas.drawPath(rightPillar, strokePaint);

    // 4. Base platen / bed line
    canvas.drawLine(
      Offset(2.5 * scale, 17.5 * scale),
      Offset(21.5 * scale, 17.5 * scale),
      strokePaint,
    );

    // 5. Horizontal tool guide rail across the cutting throat
    final railPaint = Paint()
      ..color = color.withOpacity(0.45)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0 * scale
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(6.5 * scale, 11 * scale),
      Offset(17.5 * scale, 11 * scale),
      railPaint,
    );

    // 6. Cutting tool carriage (mounted on the rail)
    final carriage = RRect.fromRectAndRadius(
      Rect.fromLTWH(10.3 * scale, 9.2 * scale, 3.4 * scale, 3.8 * scale),
      Radius.circular(0.8 * scale),
    );
    canvas.drawRRect(carriage, fillPaint);

    // 7. Sharp cutting blade tip pointing downward toward material
    final blade = Path()
      ..moveTo(11.2 * scale, 13 * scale)
      ..lineTo(12.8 * scale, 13 * scale)
      ..lineTo(12.0 * scale, 15.0 * scale)
      ..close();
    canvas.drawPath(blade, fillPaint);

    // 8. Cut line on the film sheet passing through platen
    final cutLinePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3 * scale
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(8.0 * scale, 15.0 * scale),
      Offset(16.0 * scale, 15.0 * scale),
      cutLinePaint,
    );

    // 9. Dual pinch rollers clamping the film on left & right sides
    canvas.drawCircle(Offset(6.5 * scale, 11 * scale), 1.1 * scale, fillPaint);
    canvas.drawCircle(Offset(17.5 * scale, 11 * scale), 1.1 * scale, fillPaint);
  }

  @override
  bool shouldRepaint(covariant _CuttingPlotterPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.isConnected != isConnected;
  }
}
