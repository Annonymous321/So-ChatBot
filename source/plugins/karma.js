(function () {
"use strict";

//rlemon asked for a hardcoded vote against AmberRoxannaReal
var storage = JSON.parse(
	localStorage.bot_karma || '{"amberroxannareal":-1}' );

IO.register( 'input', function karma ( msgObj ) {
	var content = msgObj.content, parts;

	if (
		//only accept new messages to prevent idiots like Nexxpresso
		msgObj.event_type === 1 &&
		(parts = /([\w\-]+)(\+\+|\-\-)/.exec(content))
	) {
		vote( parts[1], parts[2], msgObj.user_id );
	}
});

//TODO: implement a system which yells at a user if he's abusing the karma
// system, and suspends him
function vote ( subject, op ) {
	subject = subject.toLowerCase();
	var dir = {
		'++' :  1,
		'--' : -1
	}[ op ];
	bot.log( subject, dir, 'vote' );

	storage[ subject ] = ( storage[subject] || 0 ) + dir;
	localStorage.bot_karma = JSON.stringify( storage );
}

//and that's it!
//...OR IS IT?
// * WILL THEY ADD A COMMAND FRONTEND TO KARMA?
// * WILL THEY ADD A COMMAND TO DISPLAY KARMA?
// * WHAT HAS BEFALLEN THE FATE OF ZIRAK'S CLOTHES?
// * HAS DARKYEN LAID THAT GIRL?
//FIND ALL THAT AND MORE IN THE NEXT EPISODE OF...
//     __
//    / /______ __________ ___  ____ _    (_)____
//   / //_/ __ `/ ___/ __ `__ \/ __ `/   / / ___/
//  / ,< / /_/ / /  / / / / / / /_/ /   / (__  )
// /_/|_|\__,_/_/  /_/ /_/ /_/\__,_(_)_/ /____/
//                                  /___/
//
//     SAME JS TIME, SAME JS CHANNEL
//
// ==================================================
// .....................CREDITS......................
// ==================================================
//        CLOTHED MAN..................ZIRAK
//        SKIPPY THE INVISIBLE DOG.....HIMSELF
//

bot.addCommand({
	name : 'karma',
	//basic front-end for now
	fun : function ( args ) {
		var subject = args.content.toLowerCase(),
			votes = storage[ subject ];

		if ( !subject ) {
			return 'Unlike beauty, karma is not in the eye of the beholder';
		}
		return '{0} has {1} karma'.supplant(
			subject,
			votes === undefined ? 'no' : votes );
	}
});

}());
