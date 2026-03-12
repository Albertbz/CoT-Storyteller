const schedule = require('node-schedule');
const { ContainerBuilder, MessageFlags, userMention } = require('discord.js');
const { DeathPosts, Deceased } = require('../models');
const { channels } = require('./configs/ids.json');
const { Op } = require('sequelize');


const timeouts = new Map();

async function sendPost(client, postId) {
    try {
        const post = await DeathPosts.findByPk(postId, {
            include: [{
                model: Deceased,
                as: 'deceased',
                required: true
            }]
        });

        if (!post) {
            console.error(`Death post ${postId} not found`);
            return;
        }

        const deceased = post.deceased;

        const graveyardChannel = await client.channels.fetch(graveyard);

        if (!channel) {
            console.error('Graveyard channel not found');
            return;
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `${deceased.characterId}\n` +
                    `${deceased.dayOfDeath} ${deceased.monthOfDeath}, Year ${deceased.yearOfDeath}/n` +
                    `${deceased.causeOfDeath}/n` +
                    `${post.note}/n/n` +
                    `${usermention(deceased.playedById)}`
                )
            );

        await channel.send({
            components: [container], flags: [MessageFlags.IsComponentsV2]
        });

        await postInLogChannel(
            'Death Post Sent',
            `Death Post for ${characterId} posted to <#@${graveyard}>`,
            COLORS.GREEN
            )

        await post.destroy();

        timeouts.delete(postId.toString());

    } catch (error) {
        console.error('Error sending death post:', error);
    }
}


async function schedulePost(client, deathPost) {
    const scheduledPostTime = new Date(deathPost.scheduledPostTime).getTime();
    const delay = scheduledPostTime - Date.now();

    if (delay <= 0) {
        await sendPost(client, deathPost.id);
        return;
    }

    const timeoutId = setTimeout(async () => {
        await sendPost(client, deathPost.id);
    }, delay);

    timeouts.set(deathPost.id.toString(), timeoutId);

    console.log(`Scheduled death post ${deathPost.id}`);
}

async function initalizeDeathPosts(client) {
    try {
        const allPosts = await DeathPosts.findAll({
            include: [{
                model: Deceased,
                as: 'deceased',
                required: true
            }]
        });

        for (const post of allPosts) {
            await schedulePost(client, post);
        }
  
    } catch (error) {
        console.error('Error initializing death posts:', error);
    }
}

// Cancel a specific scheduled post by deceased character, not attached to anything yet. If needed, we can build this out
function cancelPost(characterID) {
        // Find the death post by characterId
        const post = await DeathPosts.findOne({
            where: {
                characterId: characterID
            }
        });

        if (!post) {
            console.log(`No death post found for character ${characterID}`);
            return false;
        }
    const timeoutId = timeouts.get(deathPost.id.toString());
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeouts.delete(deathPost.id.toString());
        await post.destroy();
        console.log(`Cancelled and deleted death post for ${characterID}`);
    }
}

module.exports = {
    sendPost,
    schedulePost,
    checkDeathPosts,
    cancelPost
};