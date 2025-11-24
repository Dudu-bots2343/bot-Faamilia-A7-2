// Código atualizado com mensagens de cargo adicionadas/removidas e registro aprovadas no estilo dos embeds enviados.

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.on("ready", () => {
    console.log(`Bot online como ${client.user.tag}`);
});

function extractTargets(message, args) {
    let cargo =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[0]);

    let usuario =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[1]);

    return { cargo, usuario };
}

function canModify(message, cargo, usuario) {
    const autor = message.member;

    if (!cargo || !usuario) return false;

    if (cargo.position >= autor.roles.highest.position) return false;
    if (usuario.roles.highest.position >= autor.roles.highest.position) return false;

    return true;
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    // ADDCARGO
    if (cmd === "addcargo") {
        const { cargo, usuario } = extractTargets(message, args);
        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Use: `!addcargo @cargo @pessoa`")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] })
                .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 20000));
        }

        if (!canModify(message, cargo, usuario)) {
            const hierarquia = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Cargo igual/maior que o seu ou pessoa com cargo maior.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [hierarquia] })
                .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 20000));
        }

        await usuario.roles.add(cargo).catch(() => {});

        // Embed estilo da imagem
        const ok = new EmbedBuilder()
            .setTitle("Família A7")
            .setColor("#00ff99")
            .setThumbnail("https://i.imgur.com/3l7YF3h.png")
            .addFields(
                { name: "Cargo:", value: `@${cargo.name} (${cargo.id})` },
                { name: "Cargo setado com sucesso no:", value: `${usuario.user.username}` },
                { name: "Quem setou:", value: `${message.member}` }
            );

        return message.channel.send({ embeds: [ok] })
            .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 20000));
    }

    // REMOVERCARGO
    if (cmd === "removercargo") {
        const { cargo, usuario } = extractTargets(message, args);
        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Use: `!removercargo @cargo @pessoa`")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] })
                .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 20000));
        }

        if (!canModify(message, cargo, usuario)) {
            const hierarquia = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Cargo igual/maior que o seu ou pessoa com cargo maior.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [hierarquia] })
                .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 20000));
        }

        await usuario.roles.remove(cargo).catch(() => {});

        // Embed estilo da imagem enviada
        const ok = new EmbedBuilder()
            .setTitle("Família A7")
            .setColor("#ff4444")
            .setThumbnail("https://i.imgur.com/3l7YF3h.png")
            .addFields(
                { name: "Cargo Removido:", value: `@${cargo.name} (${cargo.id})` },
                { name: "Cargo removido do:", value: `${usuario}` },
                { name: "Quem removeu:", value: `${message.member}` }
            );

        return message.channel.send({ embeds: [ok] })
            .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 20000));
    }
});

client.login(process.env.TOKEN);
