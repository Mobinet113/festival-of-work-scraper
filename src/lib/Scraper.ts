import {JSDOM} from 'jsdom';
import getContent from './GetContent';
import fs from 'fs';
import stringify from 'csv-stringify';

interface Company {
  name: string,
  email: string,
  website: string
}

export default class Scraper {

  public url: string = "https://www.festivalofwork.com/exhibitor-list/";
  public outputFile = 'companies.csv';
  public itemsWithNoUrl: number = 0;
  public companies: Array<Company> = [];

  public processSite = async () => {
    console.log('Getting Page');

    return await getContent(this.url).then(async (html: any) => {

      if (!html) {
        return false
      }

      let urls = this.processListPage(html);

      await this.processCompanyUrls(urls).then( () => {
        this.exportDataToCSV();
      });

    });

  };

  /**
   * Takes a DOM object and returns an array of relevent URLs
   * @param html
   */
  private processListPage = (html: string): Array<string> => {
    const dom = new JSDOM(html.toString());

    const listItems = dom.window.document.getElementsByClassName('gdlr-frame');
    let urls: Array<string> = [];

    for (let i = 0; i < listItems.length; i++) {
      let item = listItems[i];
      let anchor = item.getElementsByTagName('a')[0];

      if (typeof anchor !== "undefined") {

        let url = anchor.getAttribute('href');

        if (url) {
          urls.push(url);
        }

      } else {
        this.itemsWithNoUrl++;
      }
    }

    return urls;
  };

  /**
   * Process the array on company URLs
   * @param urls
   */
  private processCompanyUrls = async (urls: Array<string>) => {

    const promises = urls.map(async (url, index) => {
      return await this.getCompanyDetails(url);
    });

    return await Promise.all(promises);
  };

  /**
   * Get the company details from the individual company pages via url
   * @param url
   */
  private getCompanyDetails = async (url: string): Promise<Company> => {
    let company = {
      name: "",
      email: "",
      website: ""
    };

    return await getContent(url).then(html => {
      const dom = new JSDOM(html.toString()).window.document;

      company.name = this.parseName(dom);
      company.email = this.getChildLink(dom, 'portfolio-clients');
      company.website = this.getChildLink(dom, 'portfolio-website');

      this.companies.push(company);

      return company;
    })

  };

  /**
   * Grab the company name from the DOM
   * @param dom
   */
  private parseName = (dom: Document): string => {
    const name = dom.getElementsByClassName('gdlr-page-title')[0];

    if (name && name.textContent) {
      return name.textContent;
    }

    return "";
  };

  /**
   * Get the first anchor link inside an element by class
   * @param dom
   * @param className
   */
  private getChildLink = (dom: Document, className: string): string => {
    const wrapper = dom.getElementsByClassName(className)[0];

    if (wrapper) {
      let href = wrapper.getElementsByTagName('a')[0].getAttribute('href');

      if (href) {
        return href;
      }
    }

    return "";
  };

  /**
   * Convert the company to CSV and export it to file
   */
  private exportDataToCSV = () => {

    stringify(this.companies, {
      header: true
    }, (err, data) => {

      if ( err ) {
        return console.log(err);
      }

      console.log(data);


      fs.writeFile(this.outputFile, data, (err) => {
        if ( err ) {
          return console.log(err)
        }
        console.log("Companies file was exported to " + this.outputFile);
      })

    });

  }
}

