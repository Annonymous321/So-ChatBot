(function () {
"use strict";
var ownerRoom = 17;

if ( bot.adapter.roomid !== ownerRoom ) {
	return;
}

var muted = JSON.parse( localStorage.bot_muted || '{}' );

function checkMuted () {
	var now = Date.now();

	Object.iterate( muted, function ( id, obj ) {
		if ( obj.endDate < now ) {
			giveVoice( id );
		}
	});

	setTimeout( checkMuted, 60 * 1000 );
}
setTimeout( checkMuted, 60 * 1000 );

function giveVoice ( id, cb ) {
	bot.log( 'giving voice to ' + id );

	IO.xhr({
		method : 'POST',
		url : '/rooms/setuseraccess/' + ownerRoom,
		data : {
			aclUserId : id,
			fkey : bot.adapter.fkey,
			userAccess : 'read-write'
		},

		complete : finish
	});

	function finish () {
		var args = [].slice.call( arguments );
		args.unshift( id );

		delete muted[ id ];

		if ( cb ) {
			localStorage.bot_muted = JSON.stringify( muted );
			cb && ( cb.apply(null, args) );
		}
	}
}
function takeVoice ( params, cb ) {
	bot.log( 'taking voice', params );

	IO.xhr({
		method : 'POST',
		url : '/rooms/setuseraccess/' + ownerRoom,
		data : {
			aclUserId : params.id,
			fkey : bot.adapter.fkey,
			userAccess : 'remove'
		},

		complete : finish
	});

	function finish () {
		muted[ params.id ] = {
			name : params.name,
			invokingId : params.invokingId,
			endDate : calcEndDate( params.duration ).getTime()
		};

		localStorage.bot_muted = JSON.stringify( muted );
		cb.apply( null, arguments );
	}

	function calcEndDate ( duration ) {
		var ret = new Date(),
			mod = duration.slice( -1 ),
			delta = Number( duration.slice(0, -1) );

		var modifiers = {
			m : function ( offset ) {
				ret.setMinutes( ret.getMinutes() + offset );
			},
			h : function ( offset ) {
				ret.setHours( ret.getHours() + offset );
			},
			d : function ( offset ) {
				ret.setDate( ret.getDate() + offset );
			}
		};
		modifiers[ mod ]( delta );

		return ret;
	}
}

IO.register( 'userregister', function permissionCb ( user, room ) {
	bot.log( user, room, 'permissionCb' );
	var id = user.id;

	if ( Number(room) !== ownerRoom || bot.isOwner(id) || muted[id] ) {
		bot.log( 'not giving voice', user, room );
		return;
	}

	giveVoice( id );
});

function stringMuteList () {
	var keys = Object.keys( muted );

	if ( !keys.length ) {
		return 'Nobody is muted';
	}

	var base = 'http://chat.stackoverflow.com/transcript/message/';

	return keys.map(function ( k ) {
		return bot.adapter.link( k, base + muted[k].invokingId );
	}).join( '; ' );
}

function infoFromName ( name, args ) {
	var ret = {
		id : name
	};

	if ( /\D/.test(name) ) {
		ret.id = args.findUserid( name );
	}

	if ( ret.id < 0 ) {
		ret.error = 'User ' + name + ' not found';
	}
	return ret;
}

function parseDuration ( str ) {
	var parts = /\d+([dhm]?)/.exec( str );
	if ( !parts ) {
		return null;
	}

	if ( !parts[1] ) {
		parts[ 0 ] += 'm';
	}
	return parts[ 0 ];
}

bot.addCommand({
	name : 'mute',
	fun : function mute ( args ) {
		var parts = args.parse(), userID, duration;

		if ( !parts.length ) {
			return stringMuteList();
		}
		else if ( parts.length < 2 ) {
			return 'Please give mute duration, see `/help mute`';
		}

		bot.log( parts, '/mute input' );

		userID = infoFromName( parts[0], args );
		if ( userID.error ) {
			return userID.error;
		}

		duration = parseDuration( parts[1] );
		if ( !duration ) {
			return 'I don\'t know how to follow that format, see `/help mute`';
		}

		takeVoice({
			id : userID.id,
			invokingId : args.get('message_id'),
			duration : duration
		}, finish );

		function finish () {
			args.reply( 'Muted user {0} for {1}'.supplant(userID.id, duration) );
		}
	},

	permissions : {
		del : 'NONE',
		use : 'OWNER'
	},
	description : 'Mutes a user. `/mute usrid duration` ' +
		'Duration should be in the format `n[mhd]` for n minutes/hours/days. ' +
		'If only n is provided, minutes is assumed.'
});

bot.addCommand({
	name : 'unmute',
	fun : function umute ( args ) {
		var parts = args.parse();

		bot.log( parts, '/unmute input' );

		if ( !parts.length ) {
			return 'Who shall I unmute?';
		}

		var userID = infoFromName( parts[0], args );
		if ( userID.error ) {
			return userID.error;
		}

		giveVoice( userID.id, finish );

		function finish () {
			args.reply( 'Unmuted user ' + userID.id );
		}
	},

	permissions : {
		del : 'NONE',
		use : 'OWNER'
	},
	description : 'Unmutes a user. `/unmute usrid`'
});

})();
