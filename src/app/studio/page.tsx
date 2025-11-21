import Header from '@/components/Header';
import HomeContainer from '@/components/HomeContainer';

export default function StudioPage() {
  return (
    <HomeContainer
      isFixed={false}
      addClassName="studio-typography p-5 max-h-screen h-full overflow-y-hidden flex flex-col gap-5">
      <Header isFixed={false} />
      <div className="page-studio">
        <div className="relative hidden h-full min-h-0 overflow-hidden md:flex md:max-w-[40%] md:min-w-0 md:flex-[0_0_50%]">
          <img
            className="h-full w-auto max-w-full object-contain object-top"
            src="/images/dummy/studio.jpg"
            alt="studio"
            draggable={false}
          />
        </div>
        <div className="flex min-w-0 basis-full flex-col justify-between gap-5 md:max-w-[58%] md:min-w-0 md:flex-[0_0_60%] md:overflow-hidden">
          <div className="custom-scroll overflow-hidden md:flex md:flex-col md:overflow-auto md:pr-3">
            <h3>
              FOR is a creative collaboration between Moon Kim and Phan Thao Dang. The Korean-German duo strives to
              create distinctive perspectives and attitudes that deliver ideas through in-depth analysis and open
              dialogue. Adapting flexibly and practically to the unique context and challenges of each project, their
              work spans industrial, spatial, and experimental design, grounded in in-depth research, creative
              experimentation, and fluid collaboration. With expertise spanning diverse fields, FOR identifies what
              collaborators genuinely seek and creates outcomes that are both insightful and original. By combining
              their diverse backgrounds and expertise, FOR pushes the boundaries of method and expression.
            </h3>
          </div>
          <img
            className="block h-auto w-full md:hidden"
            src="/images/dummy/studio.jpg"
            alt="studio"
            draggable={false}
          />
          <div className="grid w-full grid-cols-3 gap-x-4 gap-y-10">
            <div className="flex flex-col gap-2">
              <h5>Experience</h5>
              <div className="flex flex-col">
                <span>
                  Lorem ipsum dolor <br />
                  sit amet, consectetur <br />
                  adipiscing elit, <br />
                  sed do eiusmod tempor <br />
                  dolore magna aliqua. <br />
                  Nisl tincidunt eget nullam
                  <br />
                  magna eget est lorem <br />
                  ipsum dolor sit. <br />
                  Volutpat odio facilisis mauris <br />
                  sit amet massa.{' '}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Services</h5>
              <div className="flex flex-col">
                <span>
                  Brand identitly
                  <br />
                  Art direction
                  <br />
                  Product design
                  <br />
                  Brand identitly
                  <br />
                  Art direction
                  <br />
                  Product design
                  <br />
                  Brand identitly
                  <br />
                  Art direction
                  <br />
                  Product design
                  <br />
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Clients</h5>
              <div className="flex flex-col">
                <span>
                  Google
                  <br />
                  Apple
                  <br />
                  Acne Studios
                  <br />
                  Scheme
                  <br />
                  Adidas
                  <br />
                  Nike
                  <br />
                  Cos
                  <br />
                  Cocacola
                  <br />
                  032C
                  <br />
                  Arcteryx
                  <br />
                  Stussy
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Address</h5>
              <div className="flex flex-col">
                <span>
                  55, Dosan-daero 26-gil, Gangnam-gu,
                  <br />
                  Seoul, Republic of Korea
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Contact</h5>
              <div className="flex flex-col">
                <span>
                  for@abcdefghijk.com
                  <br />
                  +00 (0)00 000 00000
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Social</h5>
              <div className="flex flex-col">
                <span>
                  @FORFORFOR
                  <br />
                  @FORFORFORfor
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeContainer>
  );
}
