Twitterから傍受した各種APIの情報(パス、レスポンス、タイムスタンプなど)を処理する為のルールを以下に記述する。
この情報を処理し、キャッシュとして保存する処理はprocessApiResponseで行う。
processApiResponseには
 processApiResponse(message: {
    path: string;
    data: unknown;
    timestamp: number;
  })
といった形で渡され、pathには https://x.com/i/api/graphql/lI07N6Otwv1PhnEgXILM7A/FavoriteTweet のようなパスが、dataにはAPIのレスポンスが、timestampにはタイムスタンプが与えられている。
このデータから必要な情報を抽出して、キャッシュに保存する。このキャッシュから必要に応じてデータを参照してDL処理＆DL履歴登録、CB登録を行うのでこれらの機能を包括できるような保存項目でキャッシュする必要がある。
→暫定的にツイート一個単位における全ての情報を保存することにした。
HomeLatestTimeline、TweetDetail、Bookmarkとかのツイート情報を含むAPIをケースごとに処理していく
HomeLatestTimeline、UserTweets、TweetDetail…などの複数のツイート情報を含むAPIリクエスト
"instructions": [
                    {
                        "type": "TimelineAddEntries",
                        "entries": [
                            {
の"entries"の配列の要素を全てキャッシュに格納する。但しこの "type"は"TimelineAddEntries"であるもののみを取得する。

UserMediaは処理が異なる。これは一旦受け取っても処理しない方向で

Favorite、Unfavoriteは一旦処理しない方向で

CreateRetweetはレスポンスを参考にIDを"retweeted": falseをtrueにする実装。

