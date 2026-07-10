import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/plotter_service.dart';
import 'plotter_connection_sheet.dart';

class PlotterStatusAction extends StatelessWidget {
  const PlotterStatusAction({super.key});

  @override
  Widget build(BuildContext context) {
    final plotterService = context.watch<PlotterService>();
    final isConnected = plotterService.connectedAddress != null;
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: IconButton(
        icon: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              isConnected ? Icons.bluetooth_connected : Icons.bluetooth,
              color: isConnected ? Colors.green : theme.colorScheme.onSurface.withOpacity(0.5),
              size: 24,
            ),
            if (isConnected)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
        tooltip: isConnected
            ? 'Plotter: ${plotterService.connectedName}'
            : 'Plotter disconnected',
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
