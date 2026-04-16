'use strict';

const gulp = require('gulp');
const { spawn } = require('child_process');

function runHeft(args, done) {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : 'npx';
  const commandArgs = isWindows ? ['/d', '/s', '/c', `npx heft ${args.join(' ')}`] : ['heft', ...args];

  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    shell: false
  });

  child.on('error', done);
  child.on('exit', (code) => {
    if (code === 0) {
      done();
    } else {
      done(new Error(`heft ${args.join(' ')} exited with code ${code}`));
    }
  });
}

gulp.task('serve', (done) => runHeft(['start'], done));
gulp.task('serve-clean', (done) => runHeft(['start', '--clean'], done));
gulp.task('build', (done) => runHeft(['test', '--clean', '--production'], done));
gulp.task('clean', (done) => runHeft(['clean'], done));
gulp.task('package-solution', (done) => runHeft(['package-solution', '--production'], done));
gulp.task('default', gulp.series('serve'));
