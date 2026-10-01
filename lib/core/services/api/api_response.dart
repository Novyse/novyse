import 'package:dio/dio.dart';

/// Shorthand for extracting the `success` field from the standard API envelope.
bool isOk(Response res) => res.data['success'] == true;

/// Shorthand for `res.data['data']`.
dynamic responseData(Response res) => res.data['data'];
