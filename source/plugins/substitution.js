(function () {
/*
  ^\s*         #tolerate pre-whitespace
  s            #substitution prefix
  (\/|\|)      #delimiter declaration
  (            #begin matching regex
    (?:        #match shit which isn't an...
      (?:\\\1) #escaped delimeter
      |        #or...
      [^\1]    #anything but the delimeter
    )*?
  )            #end matching regex
  \1           #delimeter again
  (            #the fa-chizzle all over again...this time for replacement
    (?:
      (?:\\\1)
      |
      [^\1]
    )*?
  )      #read above, I'm not repeating this crap
  \1
  (      #flag capturing group
    g?   #global (optional)
    i?   #case insensitive (optional)
  )      #FIN
 */
var sub = /^\s*s(\/|\|)((?:(?:\\\1)|[^\1])*?)\1((?:(?:\\\1)|[^\1])*?)\1(g?i?)/;
bot.listen( sub, substitute );

function substitute ( msg ) {
	var re = RegExp( msg.matches[2], msg.matches[4] ),
		replacement = msg.matches[ 3 ];

	if ( !msg.matches[2] ) {
		return 'Empty regex is empty';
	}

	getMatchingMessage( re, msg.get('message_id'), function ( err, message ) {
        if ( err ) {
            msg.reply( err );
            return;
        }

		if ( !message ) {
			msg.reply(
				'No matching message (are you sure we\'re in the right room?)'
			);
            return;
		}
		bot.log( message, 'substitution found message' );

		var link = getMessageLink( message );

		// #159, check if the message is a partial, has a "(see full text)" link.
		if ( message.getElementsByClassName('partial').length ) {
			retrieveFullText( message, finish );
		}
		else {
			finish( message.textContent );
		}

		function finish ( text ) {
			var reply = text.replace( re, replacement ) + ' ' +
				msg.link( '(source)', link );

			msg.reply( reply );
		}
	});
}

function getMatchingMessage ( re, onlyBefore, cb ) {
	var messages = Array.from(
		document.getElementsByClassName('content') ).reverse();

    var arg = {
        maxId : onlyBefore,
        pattern : re,
        messages : messages.map(function ( el ) {
            return {
                id   : Number( el.parentElement.id.match(/\d+/)[0] ),
                text : el.textContent
            };
        })
    };

    // the following function is passed to bot.eval, which means it will run in
    //a different context. the only variable we get is ~arg~, because we pass it
    //to bot.eval
    // we do the skip and jump through bot.eval to avoid a ReDoS (#217).
    var matcher = function () {
        var matchIndex = null;

        arg.messages.some(function ( msg, idx ) {
            if ( msg.id < arg.maxId && arg.pattern.test(msg.text) ) {
                matchIndex = idx;
                return true;
            }

            return false;
        });

        // remember we're inside bot.eval, final expression is the result.
        matchIndex;
    };

	bot.eval( matcher.stringContents(), arg, function ( err, resp ) {
        // meh
        if ( err ) {
            cb( err );
            return;
        }

        var index = JSON.parse( resp.answer );
        if ( Number(index) !== index ) {
            return;
        }

        cb( null, messages[index] );
    });
}

// <a class="action-link" href="/transcript/message/msgid#msgid>...</a>
// <div class="content">message</div>
//if the message was a reply, there'd be another element between them:
// <a class="reply-info" href="/transcript/message/repliedMsgId#repliedMsgId>
function getMessageLink ( message ) {
	var node = message;

	while ( !node.classList.contains('action-link') ) {
		node = node.previousElementSibling;
	}

	return node.href;
}

// <div class="content">
//  <div class="partial"> ... </div>
//  <a class="more-data" href="what we want">(see full text)</a>
// </div>
function retrieveFullText ( message, cb ) {
	var href = message.children[ 1 ].href;
	bot.log( href, 'substitution expanding message' );

	IO.xhr({
		method : 'GET',
		url : href,
		data : { plain : true },
		complete : cb
	});
}

}());
