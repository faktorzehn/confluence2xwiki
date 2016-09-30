const URL_CONFLUENCE_DISPLAY = new RegExp("^.*\/display\/[^/]+\/[^/]+$");
const URL_CONFLUENCE_PAGES = new RegExp("^.*\/pages\/viewpage\.action\\?pageId=[0-9]+$");
const URL_XWIKI = new RegExp("^.*\/bin\/view\/[^/]+(\/[^/]+)*\/?$");

class Base
{
	//split given string into urls
	static convertXWikiURL(url)
	{
		if(URL_XWIKI.test(url))
		{
			if(url.substring(url.length - 1) == "/");
				url = url.substring(0, url.length - 1);
			
			var url_base = url.substring(0, url.indexOf("/bin/view/"));
			var url_rest = url_base + "/rest/wikis/xwiki";
			
			for(let space of url.substring(url.indexOf("/bin/view/") + "/bin/view/".length).split("/"))
				url_rest += "/spaces/" + space;
			
			
			return Promise.resolve({"base": url_base, "page": url_rest});
		}
		else
			return Promise.reject("Invalid XWiki URL (RegExp)");
	}

	//split given string into urls, lookup page ID for REST usage
	static convertConfluenceURL(url)
	{
		if(URL_CONFLUENCE_PAGES.test(url))
		{
			var url_base = url.substring(0, url.indexOf("/pages/viewpage.action?pageId="));
			var url_rest = url_base + "/rest/api/content/" + url.substring(url.indexOf("/pages/viewpage.action?pageId=") + "/pages/viewpage.action?pageId=".length);
			
			return Promise.resolve({"base": url_base, "page": url_rest});
		}
		else if(URL_CONFLUENCE_DISPLAY.test(url))
		{
			var url_base = url.substring(0, url.indexOf("/display/"));
			var url_rest = url_base + "/rest/api/content/";
			
			var [space, title] = url.substring(url.indexOf("/display/") + "/display/".length).split("/");
			
			return new Promise(function(resolve, reject)
			{
				var request = new XMLHttpRequest();
				request.withCredentials = true;
				request.open("GET", url_rest + "?spaceKey=" + space + "&title=" + title);
				request.onload = function()
				{
					if(this.status == 200)
					{
						try
						{
							var response = JSON.parse(this.responseText);
						
							if(response.size >= 1)
								resolve({"base": url_base, "page": url_rest + response.results[0].id});
							else
								reject("Invalid Confluence URL (No results found)");
						}
						catch(exception)
						{
							reject("Invalid Confluence URL (Invalid response)");
						}
					}
					else
						reject("Failed to fetch " + this.responseURL + " (" + this.status + "). Are you logged in?");
				}
				request.send();
			});
		}
		else
			return Promise.reject("Invalid Confluence URL (RegExp)");
	}
	
	static replaceUmlauts(text)
	{
		return text.replace(/&Auml;/g, 'Ä').replace(/&auml;/g, 'ä').replace(/&Ouml;/g, 'Ö').replace(/&ouml;/g, 'ö').replace(/&Uuml;/g, 'Ü').replace(/&uuml;/g, 'ü');
	}
	
	static downloadBlob(url)
	{
		return new Promise(function(resolve, reject)
		{
			var request = new XMLHttpRequest();
			request.withCredentials = true;		
			request.open("GET", url);
			request.responseType = "arraybuffer";
			request.onload = function()
			{
				if(this.status == 200)
				{
					var blob = new Blob([this.response], {type: this.getResponseHeader('Content-Type')});
					resolve(blob);
				}
				else
					reject("Failed to download " + this.responseURL);
			};
			request.send();
		});
	}
	
	static uploadBlob(url, blob, retries = 0)
	{
		return new Promise(function(resolve, reject)
		{
			var request = new XMLHttpRequest();
			request.withCredentials = true;
			request.open("PUT", url);
			request.setRequestHeader("Content-type", blob.type);
			request.onload = function()
			{
				if(this.status == 201 || this.status == 202)
				{
					resolve();
				}
				else
					reject({"url": url, "blob": blob, "retries": retries, "response": this});
			};
			request.send(blob);
		}).catch(function(result)
		{
			if(result.response.status == 500)
			{
				if(result.retries == 3)
					return Promise.reject("Failed to upload " + result.response.responseURL);
				else
					return Base.uploadBlob(result.url, result.blob, result.retries + 1);
			}
			else
				return Promise.reject("Failed to upload " + result.response.responseURL);
		});
	}
	
	static transferBlob(urlFrom, urlTo)
	{
		return Base.downloadBlob(urlFrom).then(function(blob)
		{
			return Base.uploadBlob(urlTo, blob);
		});
	}
	
	//submit text to be converted by the python script
	static convert(text)
	{
		return new Promise(function(resolve, reject)
		{
			var request = new XMLHttpRequest();
			request.open("POST", "cgi-convert.py");
			request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			request.onload = function()
			{
				if(this.status == 200)
					resolve(JSON.parse(this.response))
				else
					reject("Failed to convert text")
			};
			request.send(JSON.stringify({body: text}));
		});
	}
	
	//load all pages of a multipage REST API response
	static getConfluenceMultiPage(url, structure, results = [], position = 0)
	{
		return new Promise(function(resolve, reject)
		{
			var request = new XMLHttpRequest();
			request.withCredentials = true;
			request.open("GET", url + "?start=" + position);
			request.onload = function()
			{
				if(this.status == 200)
				{
					var response = JSON.parse(this.responseText);
					
					for(let result of response.results)
						results.push(structure(result, response));
					
					position += response.size
					resolve(response.size == response.limit);
				}
				else
					reject("Failed to fetch " + this.responseURL + " (" + this.status + "). Are you logged in?");
			}
			request.send();
		}).then(function(response)
		{
			if(response)
				return Base.getConfluenceMultiPage(url, structure, results, position);
			else
				return Promise.resolve(results);
		});
	}
	
	static getConfluenceContent(url)
	{
		return new Promise(function(resolve, reject)
		{
			var request = new XMLHttpRequest();
			request.withCredentials = true;
			request.open("GET", url + "?expand=body.storage,body.editor");
			request.onload = function()
			{
				if(this.status == 200)
				{
					var response = JSON.parse(this.responseText);
					resolve({"title": response.title, "storage": Base.replaceUmlauts(response.body.storage.value), "editor": Base.replaceUmlauts(response.body.editor.value)});
				}
				else
					reject("Failed to fetch " + this.responseURL + " (" + this.status + "). Are you logged in?");
			}
			request.send();
		});
	}
	
	static createXWikiPage(url, content)
	{
		return new Promise(function(resolve, reject)
		{
			var request = new XMLHttpRequest();
			request.withCredentials = true;
			request.open("PUT", url + "?media=json");
			request.onload = function()
			{
				if(this.status == 201 || this.status == 202)
				{
					var response = JSON.parse(this.responseText);
					resolve(response.xwikiAbsoluteUrl);
				}
				else
					reject("Failed to create page " + url);
			}
			request.send(content != "" ? content : " ");
		});
	}
	
}