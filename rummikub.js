Rummikub = {
  Version: '1.0',
  
  defaultOptions: $H({
    numberOfGames: 1,
    players: new Array(),
    maxPlayers: 4
  }),
  
  ScoreBoard: Class.create({
    initialize: function(el, options){
      this.options = Rummikub.defaultOptions.merge(options).toObject()
      
      // Fetch and prepare table element
      this.table = $(el)
      this.table.insert('<thead>'+
          '<tr><td>&nbsp;</td></tr>'+
        '</thead>'+
        '<tbody></tbody>'+
        '<tfoot>'+
          '<tr><td>Totaal</td></tr>'+
        '</tfoot>')
      
      // Init games
      this.games = new Array()
      this.options.numberOfGames.times(function(){
        this.addGame(false)
      }, this)
      
      // Init players
      this.players = new Array()
      this.options.players.each(function(name){
        this.addPlayer(name, false)
      }, this)
      
      this.render()
    },
    
    addGame: function(render){
      this.games.push(new Rummikub.Game({scoreBoard: this}))
      if(render != false) this.render()
    },
    
    addPlayer: function(name, render){
      if(this.players.length < this.options.maxPlayers){
        var player = new Rummikub.Player(name.escapeHTML(), {scoreBoard: this})
        this.players.push(player)
        if(render != false){
           this.render()
           this.games.each(function(g){ g.updateScore() })
         }
        this.options.afterAddPlayer && this.options.afterAddPlayer(this, player)
      }
    },
    
    getPlayer: function(id){
      return this.players.find(function(p){ return p.id == id })
    },
    
    render: function(){
      this.players.each(function(player, i){
        if(!this.table.down('thead > tr > th.player-name-' + player.id)){
          this.table.down('thead > tr').insert(new Element('th', {'class': 'player-name-' + player.id}).update(player.name + '&nbsp;').insert(
            new Element('a', {'class': 'remove-player'}).update('x').observe('click', player.remove.bind(player))
          ))
        }
        if(!this.table.down('tfoot > tr > td.player-score-' + player.id)){
          this.table.down('tfoot > tr').insert(new Element('td', {'class': 'player-score-' + player.id}).update(0))
        }
      }, this)
      this.games.each(function(game){
        var row = this.table.down('tbody > tr.game-' + game.id) || function(){
          var newRow = new Element('tr', {'class': 'game-' + game.id}).insert('<th>Spel ' + game.id + '</th>')
          this.table.down('tbody').insert(newRow)
          return newRow
        }.bind(this)()
        this.players.each(function(player){
          if(!row.down('td.player-' + player.id)){
            var scoreField = new Element('input', {'type': 'number', 'value': 0}).
              // Timeout to fetch value AFTER event completed:
              observe('keydown', function(){ this.updateScores(game, player) }.bind(this)).
              observe('mousewheel', function(){ this.updateScores(game, player) }.bind(this)).
              observe('change', function(){ this.updateScores(game, player) }.bind(this))
            var newTd = new Element('td', {'class': 'player-' + player.id}).insert(scoreField)
            row.insert(newTd)
          }
        }, this)
      }, this);
    },
    
    updateScores: function(game, player){  
      // Timeout to fetch value AFTER all events completed:
      setTimeout(function(){
        game.updateScore()
        player.updateScore()
      }, 5)
    },
    
    parseScore: function(string){
      return (!string.match(/^-?\d+$/)) ? 0 : parseInt(string, 10)
    },
    
    _playerCount: 1,
    _gameCount: 1
  }),
  
  Game: Class.create({
    initialize: function(options){
      this.scoreBoard = options.scoreBoard
      this.id = this.scoreBoard._gameCount++
    },
    
    updateScore: function(){
      if(this.complete()){
        var winningField = this.row().down('td.player-' + this.winner().id + ' input')
        winningField.setValue(this.totalScore())
        this.winner().updateScore()
      }
      this.styleFields()
    },
    
    complete: function(){
      return this.scores().select(function(s){ return s >= 0 }).length == 1
    },
    
    winner: function(){
      if(this.complete()){
        var winningCell = this.row().select('td').find(function(cell){ return $F(cell.down('input')) >= 0 })
        var playerId = parseInt(winningCell.className.match(/player-(\d+)/)[1], 10)
        return this.scoreBoard.getPlayer(playerId)
      }else{
        return null
      }
    },
    
    scores: function(){
      return this.row().select('td > input').map(function(field){
        return this.scoreBoard.parseScore($F(field))
      }, this)
    },
    
    totalScore: function(){
      return Math.abs(this.scores().select(function(s){ return s < 0 }).inject(0, function(a, b){ return a + b}))
    },
    
    row: function(){
      return this.scoreBoard.table.down('tr.game-' + this.id)
    },
    
    styleFields: function(){
      // Remove all styles first:
      this.row().removeClassName('game-complete')
      this.row().select('td').each(function(c){ c.removeClassName('game-winner') })
      this.row().removeClassName('game-invalid')
      
      if(this.complete()){
        this.row().addClassName('game-complete')
        var winningCell = this.row().down('td.player-' + this.winner().id)
        winningCell.addClassName('game-winner')
      }else if(this.invalid()){
        this.row().addClassName('game-invalid')
      }
    },
    
    invalid: function(){
      return (this.scores().select(function(s){ return s > 0 }).length > 1) || this.scores().all(function(s){ return s < 0 })
    }
  }),
  
  Player: Class.create({
    initialize: function(name, options){
      this.name = name
      this.scoreBoard = options.scoreBoard
      this.id = this.scoreBoard._playerCount++
    },
    
    scores: function(){
      return this.cells().map(function(cell){
        return this.scoreBoard.parseScore($F(cell.down('input')))
      }, this)
    },
    
    totalScore: function(){
      return this.scores().inject(0, function(a, b){ return a + b })
    },
    
    updateScore: function(){
      this.scoreBoard.table.down('tfoot > tr > td.player-score-' + this.id).update(this.totalScore())
    },
    
    remove: function(){
      this.scoreBoard.table.down('thead > tr > th.player-name-' + this.id).remove()
      this.scoreBoard.table.down('tfoot > tr > td.player-score-' + this.id).remove()
      this.cells().each(Element.remove)
      this.scoreBoard.players = this.scoreBoard.players.without(this)
      this.scoreBoard.games.each(function(g){ g.updateScore() })
      this.scoreBoard.options.afterRemovePlayer && this.scoreBoard.options.afterRemovePlayer(this.scoreBoard, this)
    },
    
    cells: function(){
      return this.scoreBoard.table.select('td.player-' + this.id)
    }
    
  })
}
