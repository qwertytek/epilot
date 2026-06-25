import type { GameService } from '../domain/game.js';
import type { HttpResponder } from '../infra/http.js';

export type RouteContext = {
  game: GameService;
  http: HttpResponder;
};
