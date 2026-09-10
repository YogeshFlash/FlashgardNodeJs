import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/plotter_service.dart';
import 'cutting_plotter_icon.dart';
import 'plotter_connection_sheet.dart';

class PlotterStatusAction extends StatelessWidget {
  const PlotterStatusAction({super.key});

  @override
  Widget build(BuildContext context) {
    final plotterService = context.watch<PlotterService>();
    final isConnected = plotterService.connectedAddress != null;
    final theme = Theme.of(context);

    final isOtg = plotterService.isUsbPlotter;
    final Color statusColor = isConnected
        ? (isOtg ? Colors.purple : const Color(0xFF10B981))
        : theme.colorScheme.onSurface.withOpacity(0.6);

    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: IconButton(
        icon: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            // Authentic cutting plotter machine icon with blade & carriage
            CuttingPlotterIcon(
              size: 24,
              color: statusColor,
              isConnected: isConnected,
            ),
            if (isConnected)
              Positioned(
                top: -2,
                right: -4,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    shape: BoxShape.circle,
                  ),
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: isOtg ? Colors.purple : const Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
          ],
        ),
        tooltip: isConnected
            ? 'Plotter: ${plotterService.connectedName} (${plotterService.isUsbPlotter ? "OTG" : "Bluetooth"})'
            : 'Plotter disconnected (Tap to connect OTG / Bluetooth)',
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            builder: (context) => const PlotterConnectionSheet(),
          );
        },
      ),
    );
  }
}
