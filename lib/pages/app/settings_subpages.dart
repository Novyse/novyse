import 'package:flutter/material.dart';

class SettingsAccountPage extends StatelessWidget {
  const SettingsAccountPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: const [
          ListTile(
            title: Text('Username'),
            subtitle: Text('mattia'),
          ),
          ListTile(
            title: Text('Email'),
            subtitle: Text('mattia@novyse.app'),
          ),
        ],
      ),
    );
  }
}

class SettingsNotificationsPage extends StatelessWidget {
  const SettingsNotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifiche'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: const [
          SwitchListTile(
            value: true,
            onChanged: null,
            title: Text('Messaggi'),
            subtitle: Text('Placeholder'),
          ),
          SwitchListTile(
            value: false,
            onChanged: null,
            title: Text('Anteprime'),
            subtitle: Text('Placeholder'),
          ),
        ],
      ),
    );
  }
}
