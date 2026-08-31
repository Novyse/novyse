import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

// Modello dati per gli elementi della lista
class Item {
  final String title;
  final String subtitle;
  final String category;
  final String details;
  Item({
    required this.title,
    required this.subtitle,
    required this.category,
    required this.details,
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Master Detail Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Master-Detail Layout'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  // Dati di esempio divisi per categorie (Tab)
  final List<Item> _items = [
    Item(
      title: 'Progetto Flutter',
      subtitle: 'Attività di lavoro',
      category: 'Lavoro',
      details: 'Dettagli completi del Progetto Flutter e task associate.',
    ),
    Item(
      title: 'Code Review',
      subtitle: 'Attività di lavoro',
      category: 'Lavoro',
      details: 'Revisione della Pull Request #42 per il modulo di login.',
    ),
    Item(
      title: 'Spesa settimanale',
      subtitle: 'Nota personale',
      category: 'Personale',
      details: 'Acquistare frutta, verdura, latte e alimenti vari.',
    ),
    Item(
      title: 'Palestra',
      subtitle: 'Nota personale',
      category: 'Personale',
      details: 'Allenamento scheda B: gambe e spalle alle ore 18:00.',
    ),
  ];

  Item? _selectedItem;

  @override
  Widget build(BuildContext context) {
    // Breakpoint per distinguere layout Desktop/Tablet da Mobile
    final bool isWideScreen = MediaQuery.of(context).size.width >= 720;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (isWideScreen) {
            // Screen Ampio: Layout Affiancato (Master + Detail)
            return Row(
              children: [
                SizedBox(
                  width: 320,
                  child: MasterPane(
                    items: _items,
                    selectedItem: _selectedItem,
                    onItemTap: (item) {
                      setState(() {
                        _selectedItem = item;
                      });
                    },
                  ),
                ),
                const VerticalDivider(width: 1),
                Expanded(child: DetailPane(item: _selectedItem)),
              ],
            );
          } else {
            // Screen Mobile: Navigazione a pagine sovrapposte
            return MasterPane(
              items: _items,
              selectedItem: _selectedItem,
              onItemTap: (item) {
                setState(() {
                  _selectedItem = item;
                });
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => Scaffold(
                      appBar: AppBar(title: Text(item.title)),
                      body: DetailPane(item: item),
                    ),
                  ),
                );
              },
            );
          }
        },
      ),
    );
  }
}

// --- MASTER PANE (Contiene i Tab e le liste) ---
class MasterPane extends StatelessWidget {
  final List<Item> items;
  final Item? selectedItem;
  final ValueChanged<Item> onItemTap;

  const MasterPane({
    super.key,
    required this.items,
    required this.selectedItem,
    required this.onItemTap,
  });

  @override
  Widget build(BuildContext context) {
    final workItems = items.where((i) => i.category == 'Lavoro').toList();
    final personalItems = items
        .where((i) => i.category == 'Personale')
        .toList();

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Material(
            color: Theme.of(context).colorScheme.surface,
            child: const TabBar(
              tabs: [
                Tab(icon: Icon(Icons.work), text: 'Lavoro'),
                Tab(icon: Icon(Icons.person), text: 'Personale'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildItemList(workItems),
                _buildItemList(personalItems),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemList(List<Item> itemList) {
    return ListView.builder(
      itemCount: itemList.length,
      itemBuilder: (context, index) {
        final item = itemList[index];
        final isSelected = item == selectedItem;

        return ListTile(
          title: Text(item.title),
          subtitle: Text(item.subtitle),
          selected: isSelected,
          selectedTileColor: Theme.of(context).colorScheme.primaryContainer
              .withValues(alpha: 0.3),
          onTap: () => onItemTap(item),
        );
      },
    );
  }
}

// --- DETAIL PANE (Navigator interno: le sottopagine si aprono nel detail) ---
class DetailPane extends StatelessWidget {
  final Item? item;

  const DetailPane({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    if (item == null) {
      return const Center(
        child: Text(
          'Seleziona un elemento dalla lista',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    // Navigator interno: la navigazione resta confinata nel pannello detail
    return Navigator(
      key: ValueKey(item!.title), // resetta lo stack quando cambia l'elemento
      onGenerateRoute: (settings) =>
          MaterialPageRoute(builder: (_) => DetailHomePage(item: item!)),
    );
  }
}

// Pagina radice del detail
class DetailHomePage extends StatelessWidget {
  final Item item;

  const DetailHomePage({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24.0),
      children: [
        Text(item.title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: Chip(label: Text(item.category)),
        ),
        const SizedBox(height: 16),
        Text(item.details, style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 24),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.description),
          title: const Text('Documenti'),
          subtitle: const Text('Apri la sottopagina documenti'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => DocumentsPage(item: item))),
        ),
        ListTile(
          leading: const Icon(Icons.history),
          title: const Text('Cronologia'),
          subtitle: const Text('Apri la sottopagina cronologia'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context)
              .push(MaterialPageRoute(builder: (_) => HistoryPage(item: item))),
        ),
      ],
    );
  }
}

// Sottopagina di esempio: Documenti
class DocumentsPage extends StatelessWidget {
  final Item item;

  const DocumentsPage({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24.0),
      children: [
        Text(
          'Documenti di ${item.title}',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        for (int i = 1; i <= 3; i++)
          ListTile(
            leading: const Icon(Icons.insert_drive_file),
            title: Text('Documento $i'),
            subtitle: Text('Allegato $i di ${item.title}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => DocumentDetailPage(item: item, index: i),
              ),
            ),
          ),
      ],
    );
  }
}

// Sotto-sottopagina di esempio: dettaglio di un documento
class DocumentDetailPage extends StatelessWidget {
  final Item item;
  final int index;

  const DocumentDetailPage({
    super.key,
    required this.item,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Documento $index',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          Text('Contenuto del documento $index relativo a "${item.title}".'),
          const SizedBox(height: 24),
          FilledButton.icon(
            icon: const Icon(Icons.arrow_back),
            label: const Text('Torna ai documenti'),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}

// Sottopagina di esempio: Cronologia
class HistoryPage extends StatelessWidget {
  final Item item;

  const HistoryPage({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24.0),
      children: [
        Text(
          'Cronologia di ${item.title}',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        const ListTile(
          leading: Icon(Icons.edit),
          title: Text('Modifica effettuata'),
          subtitle: Text('Ieri alle 15:30'),
        ),
        const ListTile(
          leading: Icon(Icons.add),
          title: Text('Elemento creato'),
          subtitle: Text('Lunedì alle 09:00'),
        ),
      ],
    );
  }
}
