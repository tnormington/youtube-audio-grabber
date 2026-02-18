import readline from 'readline';

export class MetadataPrompter {
  constructor() {
    this.rl = null;
  }

  createInterface() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  closeInterface() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async promptForMetadata(defaultTitle = '') {
    this.createInterface();

    console.log('\n🎵 Enter metadata for the downloaded song:\n');

    const title = await this.prompt(`Title [${defaultTitle}]: `) || defaultTitle;
    const artist = await this.prompt('Artist: ');
    const album = await this.prompt('Album: ');
    const date = await this.prompt(`Year [${new Date().getFullYear()}]: `) || new Date().getFullYear().toString();

    this.closeInterface();

    return {
      title: title || 'Unknown',
      artist: artist || 'Unknown Artist',
      album: album || 'Unknown Album',
      date: date
    };
  }
}
