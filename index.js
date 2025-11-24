// ====================== APROVAR / NEGAR ==========================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);

  // Recuperar nome informado do embed
  const embed = interaction.message.embeds[0];
  const nomeInformado = embed.fields.find(f => f.name === "Nome Informado")?.value;

  // Recuperar ID Informado do embed (opcional)
  const idInformado = embed.fields.find(f => f.name === "ID Informado")?.value;

  // ========== APROVAR ==========
  if (acao === "aprovar") {
    try {
      // alterar nick
      await membro.setNickname(`A7 ${nomeInformado}`);

      // aplicar 2 cargos
      await membro.roles.add([
        process.env.CARGO_APROVADO,     // 1º cargo
        process.env.CARGO_APROVADO_2,   // 2º cargo
      ]);

      // mensagem igual ao estilo do outro servidor
      await interaction.reply({
        content:
          `✔ Registro aprovado!\n` +
          `• Nick alterado para **A7 ${nomeInformado}**\n` +
          `• Cargos aplicados.\n` +
          `• Acesso liberado para ${membro}.`,
      });

    } catch (e) {
      console.log(e);
      await interaction.reply({
        content: "❌ Erro ao aprovar. O bot precisa de permissões altas.",
        ephemeral: true
      });
    }
  }

  // ========== NEGAR ==========
  else if (acao === "negar") {
    try {
      await membro.kick("Registro negado pelo aprovador.");

      await interaction.reply({
        content:
          `❌ Registro negado!\n` +
          `• O usuário **${membro.user.tag}** foi expulso do servidor.`,
      });

    } catch (e) {
      console.log(e);
      await interaction.reply({
        content: "❌ Não consegui expulsar o usuário. Verifique permissões.",
        ephemeral: true
      });
    }
  }
});
