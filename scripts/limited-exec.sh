#!/usr/bin/env perl
# TODO: Remove entire file
# Run a command with a wall-clock cap, killing the whole process group on
# expiry. Exits 124 on timeout, otherwise the child's exit status.
#
# Usage: perl scripts/limited-exec.sh <seconds> <command> [args...]
#
# Why not `alarm` + `exec`: a pending alarm only terminates the process that
# set it. Real builds spawn children (xcodebuild, cargo) that inherit the
# stdout pipe, so killing just the parent leaves the reader blocked on a pipe
# nobody will ever close. Killing the process group closes it.

use strict;
use warnings;
no warnings 'exec'; # the post-exec fallback is only reached if exec fails
use POSIX qw(WIFEXITED WEXITSTATUS);

my $timeout = shift @ARGV;
die "limited-exec: first argument must be a timeout in seconds\n"
  unless defined $timeout && $timeout =~ /^\d+$/;
die "limited-exec: no command given\n" unless @ARGV;

my $pid = fork();
die "limited-exec: fork failed: $!\n" unless defined $pid;

if ($pid == 0) {
  # New process group, so the timeout can signal every descendant at once.
  setpgrp(0, 0);
  exec { $ARGV[0] } @ARGV;
  print STDERR "limited-exec: cannot exec $ARGV[0]: $!\n";
  exit 127;
}

my $timed_out = 0;
$SIG{ALRM} = sub {
  $timed_out = 1;
  kill 'KILL', -$pid;
};
alarm $timeout;

waitpid($pid, 0);
alarm 0;

if ($timed_out) {
  warn "limited-exec: timed out after ${timeout}s, killed process group -$pid\n";
  exit 124;
}

exit(WIFEXITED($?) ? WEXITSTATUS($?) : 1);