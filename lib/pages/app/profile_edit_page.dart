import 'package:flutter/material.dart';

class ProfileEditPage extends StatelessWidget {
  const ProfileEditPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Modifica profilo'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: const Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 96),
        child: Text(
          'Pagina di test: su schermi larghi resta nel master, non a tutta pagina.',
        ),
      ),
    );
  }
}
